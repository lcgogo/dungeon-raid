'use strict';
const fs=require('fs');
const src=fs.readFileSync(__dirname+'/../../worker/src/index.js','utf8');
const pruneQuery=src.match(/`(SELECT id FROM scores WHERE [^`]+)`/);
if(!pruneQuery) throw new Error('missing prune query');
if(!/WHERE cleared=0 AND created < \?/.test(pruneQuery[1])) throw new Error('prune query must preserve cleared rows');
console.log('PASS pruning query retains historical clear records');
