FROM python:3.12.0a5-slim

COPY src /opt/opencti-worker

WORKDIR /opt/opencti-worker

RUN apk --no-cache add git build-base libmagic libffi-dev \
    && pip3 install --no-cache-dir -r requirements.txt \
    && pip3 install --upgrade --force --no-cache-dir git+https://github.com/OpenCTI-Platform/client-python@master \
    && apk del git build-base

ENTRYPOINT ["python3"]
CMD ["worker.py"]
