-- Initial schema for the Pokedex APIs (applied on first MySQL volume init).

CREATE DATABASE IF NOT EXISTS pokedex;
USE pokedex;

CREATE TABLE IF NOT EXISTS pokemon (
  number VARCHAR(16) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  total INT NOT NULL,
  hp INT NOT NULL,
  attack INT NOT NULL,
  defense INT NOT NULL,
  sp_atk INT NOT NULL,
  sp_def INT NOT NULL,
  speed INT NOT NULL,
  PRIMARY KEY (number)
);
