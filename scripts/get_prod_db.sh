#!/bin/bash

CONTAINER=gptwrapper_db
SERVICE_NAME=db
DB_NAME=postgres

FOLDER_NAME="gptwrapper"

PROJECT_ROOT=$(dirname $(dirname $(realpath "$0")))
BACKUPS=$PROJECT_ROOT/backups/
DOCKER_COMPOSE=$PROJECT_ROOT/compose.yaml

S3_CONF=~/.s3cfg

retry () {
    for i in {1..60}
    do
        $@ && break || echo "Retry attempt $i failed, waiting..." && sleep 3;
    done
}

if [ ! -f "$S3_CONF" ]; then
  echo ""
  echo "!! No config file for s3 bucket !!"
  echo "Create file for path ~/.s3cfg and copy the credetials from version.helsinki.fi"
  echo ""
  return 0
fi

echo "Creating backups folder"
mkdir -p ${BACKUPS}

echo "Listing available backups in S3 bucket..."
backup_files=$(s3cmd -c "$S3_CONF" ls "s3://psyduck/${FOLDER_NAME}/" | awk '{print $4}' | grep '\.sql\.gz$')

if [ -z "$backup_files" ]; then
  echo "No backup files found in S3 bucket!"
  exit 1
fi

echo "Available backups:"
select chosen_backup in $backup_files; do
  if [ -n "$chosen_backup" ]; then
    echo "You selected: $chosen_backup"
    FILE_NAME=$(basename "$chosen_backup")
    break
  else
    echo "Invalid selection. Please select a valid backup number."
  fi
done

echo "Fetching the selected dump: $FILE_NAME"
s3cmd -c "$S3_CONF" get "$chosen_backup" "$BACKUPS"

if [ ! -f "${BACKUPS}${FILE_NAME}" ]; then
  echo "Download failed or file not found: ${BACKUPS}${FILE_NAME}"
  exit 1
fi

echo "Removing database and related volume"
docker-compose -f $DOCKER_COMPOSE down -v

echo "Starting postgres in the background"
docker-compose -f $DOCKER_COMPOSE up -d $SERVICE_NAME

retry docker-compose -f $DOCKER_COMPOSE exec $SERVICE_NAME pg_isready --dbname=$DB_NAME

echo "Populating Lomake"
docker exec -i $CONTAINER /bin/bash -c "gunzip | psql -U postgres" < ${BACKUPS}${FILE_NAME}
