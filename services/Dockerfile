FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY cube_preview.py .
ENV CUBE_BIND=0.0.0.0 CUBE_PORT=8767
USER 65534:65534
EXPOSE 8767
CMD ["python", "cube_preview.py"]
