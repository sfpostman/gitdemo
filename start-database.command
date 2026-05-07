#!/bin/bash

echo "================================"
echo "   Pokemon API - Starting DB..."
echo "================================"

# Start MySQL if not already running
if ! mysqladmin ping --silent 2>/dev/null; then
  echo "  Starting MySQL..."
  brew services start mysql
  echo "  Waiting for MySQL to be ready..."
  until mysqladmin ping --silent 2>/dev/null; do sleep 1; done
else
  echo "  MySQL already running."
fi

# Create database and table if they don't exist
mysql -u root <<'SQL'
CREATE DATABASE IF NOT EXISTS pokedex;
USE pokedex;
CREATE TABLE IF NOT EXISTS pokemon (
  number   VARCHAR(10),
  name     VARCHAR(100),
  type     VARCHAR(50),
  total    INT,
  hp       INT,
  attack   INT,
  defense  INT,
  sp_atk   INT,
  sp_def   INT,
  speed    INT
);
SQL

echo ""
echo "  Database: pokedex"
echo "  Table:    pokemon"
echo ""
echo "  MySQL is ready."
echo "  Press Ctrl+C to stop."
echo "================================"

trap "brew services stop mysql; echo 'MySQL stopped.'" EXIT

wait
