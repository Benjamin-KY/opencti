import * as R from 'ramda';
import EventSource from 'eventsource';
import axios from 'axios';
import { clearIntervalAsync, setIntervalAsync } from 'set-interval-async/fixed';
import conf, { logApp } from '../config/conf';
import { createRelation, deleteElementById, internalLoadById, loadById } from '../database/middleware';
import { listEntities } from '../database/repository';
import { SYSTEM_USER } from '../utils/access';
import { buildInputDataFromStix } from '../database/stix';
import { sleep } from '../../tests/utils/testQuery';
import { isStixCyberObservable } from '../schema/stixCyberObservable';
import { UnsupportedError } from '../config/errors';
import { addStixCyberObservable } from '../domain/stixCyberObservable';
import { isStixCoreRelationship } from '../schema/stixCoreRelationship';
import { isStixSightingRelationship } from '../schema/stixSightingRelationship';
import { addStixSightingRelationship } from '../domain/stixSightingRelationship';
import { addLabel } from '../domain/label';
import { addExternalReference } from '../domain/externalReference';
import { addKillChainPhase } from '../domain/killChainPhase';
import {
  ENTITY_TYPE_EXTERNAL_REFERENCE,
  ENTITY_TYPE_KILL_CHAIN_PHASE,
  ENTITY_TYPE_LABEL,
  ENTITY_TYPE_MARKING_DEFINITION,
  isStixMetaObject,
} from '../schema/stixMetaObject';
import {
  ENTITY_TYPE_ATTACK_PATTERN,
  ENTITY_TYPE_CAMPAIGN,
  ENTITY_TYPE_CONTAINER_NOTE,
  ENTITY_TYPE_CONTAINER_OBSERVED_DATA,
  ENTITY_TYPE_CONTAINER_OPINION,
  ENTITY_TYPE_CONTAINER_REPORT,
  ENTITY_TYPE_COURSE_OF_ACTION,
  ENTITY_TYPE_IDENTITY_INDIVIDUAL,
  ENTITY_TYPE_IDENTITY_ORGANIZATION,
  ENTITY_TYPE_IDENTITY_SECTOR,
  ENTITY_TYPE_IDENTITY_SYSTEM,
  ENTITY_TYPE_INCIDENT,
  ENTITY_TYPE_INDICATOR,
  ENTITY_TYPE_INFRASTRUCTURE,
  ENTITY_TYPE_INTRUSION_SET,
  ENTITY_TYPE_LOCATION_CITY,
  ENTITY_TYPE_LOCATION_COUNTRY,
  ENTITY_TYPE_LOCATION_POSITION,
  ENTITY_TYPE_LOCATION_REGION,
  ENTITY_TYPE_MALWARE,
  ENTITY_TYPE_THREAT_ACTOR,
  ENTITY_TYPE_TOOL,
  ENTITY_TYPE_VULNERABILITY,
  isStixDomainObject,
} from '../schema/stixDomainObject';
import { addCampaign } from '../domain/campaign';
import { addCity } from '../domain/city';
import { addCountry } from '../domain/country';
import { addIncident } from '../domain/incident';
import { addIndicator } from '../domain/indicator';
import { addIntrusionSet } from '../domain/intrusionSet';
import { addMalware } from '../domain/malware';
import { addMarkingDefinition } from '../domain/markingDefinition';
import { addNote } from '../domain/note';
import { addObservedData } from '../domain/observedData';
import { addOpinion } from '../domain/opinion';
import { addAttackPattern } from '../domain/attackPattern';
import { addReport } from '../domain/report';
import { addCourseOfAction } from '../domain/courseOfAction';
import { addIndividual } from '../domain/individual';
import { addOrganization } from '../domain/organization';
import { addSector } from '../domain/sector';
import { addSystem } from '../domain/system';
import { addInfrastructure } from '../domain/infrastructure';
import { addRegion } from '../domain/region';
import { addPosition } from '../domain/position';
import { addThreatActor } from '../domain/threatActor';
import { addTool } from '../domain/tool';
import { addVulnerability } from '../domain/vulnerability';
import Queue from '../utils/queue';
import { ENTITY_TYPE_SYNC } from '../schema/internalObject';
import { createSyncHttpUri, httpBase, patchSync } from '../domain/connector';
import { lockResource } from '../database/redis';
import { stixCoreObjectImportDelete, stixCoreObjectImportPush } from '../domain/stixCoreObject';
import { rawFilesListing } from '../database/minio';

const SYNC_MANAGER_KEY = conf.get('sync_manager:lock_key') || 'sync_manager_lock';

const syncManagerInstance = (syncId) => {
  const STATE_UPDATE_SIZE = 100;
  const MIN_QUEUE_SIZE = 100;
  const MAX_QUEUE_SIZE = 500;
  const lDelay = 10;
  const hDelay = 1000;
  // Variables
  let connectionId = null;
  let eventsQueue;
  let eventSource;
  let syncElement;
  let run = true;
  const startStreamListening = async () => {
    eventsQueue = new Queue();
    syncElement = await loadById(SYSTEM_USER, syncId, ENTITY_TYPE_SYNC);
    const { token, ssl_verify: ssl = false } = syncElement;
    const eventSourceUri = createSyncHttpUri(syncElement);
    logApp.info(`[OPENCTI] Running sync manager for ${syncId} (${eventSourceUri})`);
    eventSource = new EventSource(eventSourceUri, {
      rejectUnauthorized: ssl,
      headers: { authorization: `Bearer ${token}` },
    });
    eventSource.on('create', (d) => {
      eventsQueue.enqueue(d);
    });
    eventSource.on('delete', (d) => {
      eventsQueue.enqueue(d);
    });
    eventSource.on('connected', (d) => {
      connectionId = JSON.parse(d.data).connectionId;
    });
    eventSource.on('error', (error) => {
      logApp.error(`[OPENCTI] Error in sync manager for ${syncId}: ${error.message}`);
    });
    return syncElement;
  };
  const manageBackPressure = async ({ uri, token }, currentDelay) => {
    if (connectionId) {
      const connectionManagement = `${httpBase(uri)}stream/connection/${connectionId}`;
      const config = { headers: { authorization: `Bearer ${token}` } };
      if (currentDelay === lDelay && eventsQueue.getLength() > MAX_QUEUE_SIZE) {
        await axios.post(connectionManagement, { delay: hDelay }, config);
        logApp.info(`Connection setup to use ${hDelay} delay`);
        return hDelay;
      }
      if (currentDelay === hDelay && eventsQueue.getLength() < MIN_QUEUE_SIZE) {
        await axios.post(connectionManagement, { delay: lDelay }, config);
        logApp.info(`Connection setup to use ${lDelay} delay`);
        return lDelay;
      }
    }
    return currentDelay;
  };
  const handleDeleteEvent = async (user, data) => {
    const { type } = buildInputDataFromStix(data);
    logApp.info(`[OPENCTI] Sync deleting element ${type} ${data.id}`);
    await deleteElementById(user, data.id, type);
  };
  const handleFilesSync = async (user, elementFile, data) => {
    const { token, uri } = syncElement;
    const entityFiles = data.x_opencti_files || [];
    const entityDirectory = `import/${data.x_opencti_type}/${elementFile.internal_id}/`;
    // Find the files we need to upload/update and files that need to be deleted.
    const currentFiles = await rawFilesListing(user, entityDirectory);
    const currentFileIds = currentFiles.map((c) => c.name);
    const entityFileIds = entityFiles.map((c) => c.value);
    // Delete files when needed
    const filesToDelete = currentFileIds.filter((c) => !entityFileIds.includes(c));
    for (let deleteIndex = 0; deleteIndex < filesToDelete.length; deleteIndex += 1) {
      const fileToDeleteId = filesToDelete[deleteIndex];
      const file = R.find((c) => c.name === fileToDeleteId, currentFiles);
      await stixCoreObjectImportDelete(user, file.id);
    }
    // Add new files if needed
    const currentFileVersionIds = currentFiles.map((c) => `${c.name}-${c.metaData.version}`);
    const entityFileVersionIds = entityFiles.map((c) => `${c.value}-${c.version}`);
    const filesToUpload = entityFileVersionIds.filter((c) => !currentFileVersionIds.includes(c));
    for (let index = 0; index < filesToUpload.length; index += 1) {
      const fileToUploadId = filesToUpload[index];
      const fileToUpload = R.find((c) => `${c.value}-${c.version}` === fileToUploadId, entityFiles);
      const { uri: fileUri, value, mime_type: mimetype, version } = fileToUpload;
      const fileStream = await axios.get(`${httpBase(uri)}storage/get/${fileUri}`, {
        responseType: 'stream',
        headers: { authorization: `Bearer ${token}` },
      });
      const file = { createReadStream: () => fileStream.data, filename: value, mimetype, version };
      await stixCoreObjectImportPush(user, elementFile, file);
    }
  };
  const handleCreateEvent = async (user, data) => {
    const { type, input } = buildInputDataFromStix(data);
    // Then create the elements
    if (isStixCoreRelationship(type)) {
      logApp.info(`[OPENCTI] Sync creating relation ${input.relationship_type} ${input.fromId}/${input.toId}`);
      await createRelation(user, input);
    } else if (isStixSightingRelationship(type)) {
      logApp.info(`[OPENCTI] Sync creating sighting ${input.fromId}/${input.toId}`);
      await addStixSightingRelationship(user, { ...input, relationship_type: input.type });
    } else if (isStixDomainObject(type) || isStixMetaObject(type)) {
      let element;
      logApp.info(`[OPENCTI] Sync creating entity ${type} ${input.stix_id}`);
      // Stix domains
      if (type === ENTITY_TYPE_ATTACK_PATTERN) {
        element = await addAttackPattern(user, input);
      } else if (type === ENTITY_TYPE_CAMPAIGN) {
        element = await addCampaign(user, input);
      } else if (type === ENTITY_TYPE_CONTAINER_NOTE) {
        element = await addNote(user, input);
      } else if (type === ENTITY_TYPE_CONTAINER_OBSERVED_DATA) {
        element = await addObservedData(user, input);
      } else if (type === ENTITY_TYPE_CONTAINER_OPINION) {
        element = await addOpinion(user, input);
      } else if (type === ENTITY_TYPE_CONTAINER_REPORT) {
        element = await addReport(user, input);
      } else if (type === ENTITY_TYPE_COURSE_OF_ACTION) {
        element = await addCourseOfAction(user, input);
      } else if (type === ENTITY_TYPE_IDENTITY_INDIVIDUAL) {
        element = await addIndividual(user, input);
      } else if (type === ENTITY_TYPE_IDENTITY_ORGANIZATION) {
        element = await addOrganization(user, input);
      } else if (type === ENTITY_TYPE_IDENTITY_SECTOR) {
        element = await addSector(user, input);
      } else if (type === ENTITY_TYPE_IDENTITY_SYSTEM) {
        element = await addSystem(user, input);
      } else if (type === ENTITY_TYPE_INDICATOR) {
        element = await addIndicator(user, input);
      } else if (type === ENTITY_TYPE_INFRASTRUCTURE) {
        element = await addInfrastructure(user, input);
      } else if (type === ENTITY_TYPE_INTRUSION_SET) {
        element = await addIntrusionSet(user, input);
      } else if (type === ENTITY_TYPE_LOCATION_CITY) {
        element = await addCity(user, input);
      } else if (type === ENTITY_TYPE_LOCATION_COUNTRY) {
        element = await addCountry(user, input);
      } else if (type === ENTITY_TYPE_LOCATION_REGION) {
        element = await addRegion(user, input);
      } else if (type === ENTITY_TYPE_LOCATION_POSITION) {
        element = await addPosition(user, input);
      } else if (type === ENTITY_TYPE_MALWARE) {
        element = await addMalware(user, input);
      } else if (type === ENTITY_TYPE_THREAT_ACTOR) {
        element = await addThreatActor(user, input);
      } else if (type === ENTITY_TYPE_TOOL) {
        element = await addTool(user, input);
      } else if (type === ENTITY_TYPE_VULNERABILITY) {
        element = await addVulnerability(user, input);
      } else if (type === ENTITY_TYPE_INCIDENT) {
        element = await addIncident(user, input);
      }
      // Stix meta
      else if (type === ENTITY_TYPE_LABEL) {
        element = await addLabel(user, input);
      } else if (type === ENTITY_TYPE_EXTERNAL_REFERENCE) {
        element = await addExternalReference(user, input);
      } else if (type === ENTITY_TYPE_KILL_CHAIN_PHASE) {
        element = await addKillChainPhase(user, input);
      } else if (type === ENTITY_TYPE_MARKING_DEFINITION) {
        element = await addMarkingDefinition(user, input);
      } else {
        throw UnsupportedError(`${type} not handle by synchronizer`);
      }
      // Handle files
      await handleFilesSync(user, element, data);
    } else if (isStixCyberObservable(type)) {
      logApp.info(`[OPENCTI] Sync creating cyber observable ${type} ${input.stix_id}`);
      const element = await addStixCyberObservable(user, input);
      // Handle files
      await handleFilesSync(user, element, data);
    } else {
      throw UnsupportedError(`${type} not handle by synchronizer`);
    }
  };
  return {
    id: syncId,
    stop: () => {
      logApp.info(`[OPENCTI] Sync stopping manager for ${syncId}`);
      run = false;
      eventSource.close();
      eventsQueue = null;
    },
    start: async () => {
      run = true;
      const sync = await startStreamListening();
      const user = sync.user_id ? await internalLoadById(SYSTEM_USER, sync.user_id) : SYSTEM_USER;
      let currentDelay = lDelay;
      let eventCount = 0;
      while (run) {
        const event = eventsQueue.dequeue();
        if (event) {
          try {
            currentDelay = manageBackPressure(sync, currentDelay);
            const { type: eventType } = event;
            const { data } = JSON.parse(event.data);
            if (eventType === 'delete') {
              await handleDeleteEvent(user, data);
            }
            if (eventType === 'create') {
              await handleCreateEvent(user, data);
            }
            // Update the current state
            if (eventCount > STATE_UPDATE_SIZE) {
              await patchSync(SYSTEM_USER, syncId, { current_state: data.updated_at });
              eventCount = 0;
            }
            eventCount += 1;
          } catch (e) {
            logApp.error('[OPENCTI] Sync error processing event', { error: e });
          }
        }
        await sleep(10);
      }
    },
    isRunning: () => run,
  };
};

const initSyncManager = () => {
  const WAIT_TIME_ACTION = 2000;
  let syncListening = true;
  const syncManagers = new Map();
  const processStep = async () => {
    // Get syncs definition
    const syncs = await listEntities(SYSTEM_USER, [ENTITY_TYPE_SYNC], { connectionFormat: false });
    // region Handle management of existing synchronizer
    for (let index = 0; index < syncs.length; index += 1) {
      // eslint-disable-next-line prettier/prettier
      const { id, running } = syncs[index];
      const syncInstance = syncManagers.get(id);
      if (syncInstance) {
        // Sync already exist
        if (running && !syncInstance.isRunning()) {
          syncInstance.start();
        }
        if (!running && syncInstance.isRunning()) {
          syncInstance.stop();
        }
      } else if (running) {
        // Sync is not currently running but it should be
        const manager = syncManagerInstance(id);
        syncManagers.set(id, manager);
        // noinspection ES6MissingAwait
        manager.start();
      }
    }
    // endregion
    // region Handle potential deletions
    const existingSyncs = syncs.map((s) => s.id);
    const deletedSyncs = Array.from(syncManagers.values()).filter((s) => !existingSyncs.includes(s.id));
    for (let deleteIndex = 0; deleteIndex < deletedSyncs.length; deleteIndex += 1) {
      const deletedSync = deletedSyncs[deleteIndex];
      deletedSync.stop();
      syncManagers.delete(deletedSync.id);
    }
    // endregion
  };
  const processingLoop = async () => {
    while (syncListening) {
      await processStep();
      await sleep(WAIT_TIME_ACTION);
    }
    // Stopping
    // eslint-disable-next-line no-restricted-syntax
    for (const syncManager of syncManagers.values()) {
      if (syncManager.isRunning()) {
        await syncManager.stop();
      }
    }
  };
  const syncManagerHandler = async () => {
    let lock;
    try {
      logApp.debug('[OPENCTI-MODULE] Running sync manager');
      lock = await lockResource([SYNC_MANAGER_KEY]);
      await processingLoop();
    } catch (e) {
      // We dont care about failing to get the lock.
      logApp.info('[OPENCTI-MODULE] Sync manager already in progress by another API');
    } finally {
      logApp.debug('[OPENCTI-MODULE] Sync manager done');
      if (lock) await lock.unlock();
    }
  };
  let scheduler;
  const shutdown = async () => {
    syncListening = false;
    if (scheduler) {
      return clearIntervalAsync(scheduler);
    }
    return true;
  };
  return {
    start: async () => {
      // processingLoopPromise = processingLoop();
      scheduler = setIntervalAsync(async () => {
        await syncManagerHandler();
      }, WAIT_TIME_ACTION);
      // Handle hot module replacement resource dispose
      if (module.hot) {
        module.hot.dispose(async () => {
          await shutdown();
          logApp.info(`[OPENCTI-MODULE] Sync hot reload dispose`);
        });
      }
    },
    shutdown,
  };
};
const syncManager = initSyncManager();

export default syncManager;
