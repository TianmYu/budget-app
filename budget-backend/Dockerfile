# Use a lightweight Alpine-based Python image
FROM python:3.9-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose server port
EXPOSE 8000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "--certfile=cert.pem", "--keyfile=key.pem", "app:app"]
