set names utf8;

drop database if exists n9e_hbs;
create database n9e_hbs;
use n9e_hbs;

create table `judge` (
  `id`    int unsigned not null auto_increment,
  `ip`    varchar(255) not null,
  `port` 	varchar(16) not null,
  `ts`    int unsigned not null,
  primary key (`id`),
  key(`ip`,`port`)
) engine=innodb default charset=utf8;

create table `idx` (
  `id`         int unsigned not null auto_increment,
  `ip`         varchar(255) not null,
  `rpc_port`   varchar(16) not null,
  `http_port`  varchar(16) not null,
  `ts`         int unsigned not null,
  primary key (`id`),
  key(`ip`,`rpc_port`)
) engine=innodb default charset=utf8;

create table `detector` (
  `id`    int unsigned not null auto_increment,
  `node`  varchar(16) not null,
  `region`  varchar(64) not null,
  `ip`    varchar(255) not null,
  `port`  varchar(16) not null,
  `ts`    int unsigned not null,
  primary key (`id`),
  key(`ip`,`port`)
) engine=innodb default charset=utf8;

create table `monapi` (
  `id`    int unsigned not null auto_increment,
  `ip`    varchar(255) not null,
  `port`  varchar(16) not null,
  `ts`    int unsigned not null,
  primary key (`id`),
  key(`ip`,`port`)
) engine=innodb default charset=utf8;

create table `ccpapi` (
  `id`    int unsigned not null auto_increment,
  `ip`    varchar(255) not null,
  `port`  varchar(16) not null,
  `ts`    int unsigned not null,
  primary key (`id`),
  key(`ip`,`port`)
) engine=innodb default charset=utf8;