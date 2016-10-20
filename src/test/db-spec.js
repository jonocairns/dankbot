'use strict';

import test from 'ava';

const Database = require('../lib/db.js');
const config = require('../config.json');
const MongoClient = require('mongodb').MongoClient;

test.after.always(() => {
  Database.deleteAll('test');
});

test('Can connect to db', (t) => {
  MongoClient.connect(config.mongo, (err, db) => {
      if (err) {
        throw err;
      }
      t.pass('db connection successful.');
  });
});

test('Can save and load single', (t) => {
  var testObj = {
    id: Math.floor(Math.random()*1000),
    name: 'dank'
  }

  t.notThrows(() => {
      Database.insert('test', testObj);
  });
  Database.load(testObj, 'test', (item) => {
    t.is(testObj.id, item.id);
  });
});

test('Can save and load many', (t) => {
  let dummyItems = [];
  for(let i; i < 3; i += 1) {
      let testObj = {
        id: Math.floor(Math.random()*1000),
        name: 'dank'
      }
      dummyItems.push(testObj);
  }

  t.notThrows(() => {
      Database.saveMany('test', dummyItems);
  });
  Database.loadMany('test', (items) => {
    t.true(dummyItems.every(elem => items.indexOf(elem) > -1));
  });
});

test('Can update item', (t) => {
  var testObj = {
    id: Math.floor(Math.random()*1000),
    name: 'dank'
  }
  var propToUpdate = { name: 'anne' };
  Database.insert('test', testObj, () => {
    Database.update({ id: testObj.id }, propToUpdate, 'test', (item) =>{
        t.is(item.name, propToUpdate.name);
        t.is(item.id, propToUpdate.id);    
    });
  });
});

test('Can delete item', (t) => {
  var testObj = {
    id: Math.floor(Math.random()*1000),
    name: 'dank'
  }
  var propToUpdate = { name: 'anne' };
  Database.insert('test', testObj, () => {
    Database.delete({ id: testObj.id }, 'test', (itemsRemoved) =>{
        t.is(itemsRemoved, 1);
        Database.load({ id: testObj.id }, 'test', (i) => {
          t.is(i, undefined);
        });
    });
  });
});
