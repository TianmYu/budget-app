# STAGE 1: build frontend
FROM node:20-alpine AS build

WORKDIR /app

# make target folder for frontend build
RUN mkdir -p /app/budget-backend

# Copy the frontend code and build it
COPY ./budget-frontend ./budget-frontend
WORKDIR /app/budget-frontend

RUN npm install
RUN npm run build

# STAGE 2: deploy with backend
FROM python:3.9-alpine AS deploy

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file and install Python dependencies
COPY ./budget-backend/requirements.txt .
RUN pip install --no-cache-dir -r ./requirements.txt

# Copy the rest of the application code
COPY ./budget-backend .

# copy the frontend build
COPY --from=build /app/budget-backend/dist ./dist

# Expose server port
EXPOSE 8000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "--certfile=creds/cert.pem", "--keyfile=creds/key.pem", "app:app"]
