var _ = require('lodash');

var Maranon = function(schema, enableStore, cacheBackupPeriod) {
  var store = enableStore ? require('store') : { enabled: false };

  var ONE_MINUTE = 60000;

  var caches = {};
  var manyToManys = {};
  var properties = {};
  var subscriptions = {};
  var thiz = {};

  function init() {
    _.forOwn(schema.model, initTypeCache);
    _.forOwn(schema.manyToMany, _.partial(initManyToMany, schema));
    _.forOwn(schema.properties, initPropertyCache);
    backupEvery(cacheBackupPeriod || ONE_MINUTE);
  }

  function initTypeCache(type, typeName) {
    caches[typeName] = getBackedUpCache(typeName) || Cache(type);
    subscriptions[typeName] = [];
    addGettersAndSettersFor(type, typeName);
  }

  function getCacheBackupKey(typeName) {
    return typeName + '_cache';
  }

  function getManyToManyBackupKey(manyToManyName) {
    return manyToManyName + '_manyToMany';
  }

  function getPropertyBackupKey(propertyName) {
    return propertyName + '_property';
  }

  function getBackedUpCache(typeName) {
    if(!store.enabled) return;
    var backup = store.get(getCacheBackupKey(typeName));
    if(backup) return backup;
  }

  function getBackedUpManyToMany(manyToManyName) {
    if(!store.enabled) return;
    var backup = store.get(getManyToManyBackupKey(manyToManyName));
    if(backup) return backup;
  }

  function getBackedUpProperty(propertyName) {
    if(!store.enabled) return;
    var backup = store.get(getPropertyBackupKey(propertyName));
    if(backup) return backup;
  }

  function backupEvery(millis) {
    store.enabled && setInterval(doBackup, millis);
  }

  function doBackup() {
    _.forOwn(caches, backupCache);
    _.forOwn(manyToManys, backupManyToMany);
  }

  function backupCache(cache, typeName) {
    store.set(getCacheBackupKey(typeName), cache);
  }

  function backupManyToMany(manyToMany, manyToManyName) {
    store.set(getManyToManyBackupKey(manyToManyName), manyToMany);
  }

  function initManyToMany(schema, manyToMany, manyToManyName) {
    manyToManys[manyToManyName] = getBackedUpManyToMany() || new ManyToMany();
    addManyToManyGettersAndSetters(schema, manyToMany, manyToManyName);
  }

  function initPropertyCache(property, propertyKey) {
    properties[propertyKey] = getBackedUpProperty();
    subscriptions[getPropertySubscriptionKey(propertyKey)] = [];
    var fnSuffix =  _.capitalize(propertyKey) + 'Property';

    thiz['get' + fnSuffix] = _.partial(getProperty, propertyKey);
    thiz['put' + fnSuffix] = _.partial(putProperty, !property.doNotPersist, propertyKey);
    thiz['delete' + fnSuffix] = _.partial(deleteProperty, !property.doNotPersist, propertyKey);
  }

  function getProperty(key) {
    return properties[key];
  }

  function putProperty(persist, key, value) {
    properties[key] = value;
    if(store.enabled && persist) store.set(getPropertyBackupKey(key), value);
    invokeSubscribedActions(getPropertySubscriptionKey(key));
  }

  function getPropertySubscriptionKey(propertyName) {
    return propertyName + '_property';
  }

  function deleteProperty(persisted, key) {
    delete properties[key];
    if(store.enabled && persisted) store.remove(getPropertyBackupKey(key));
  }

  function addManyToManyGettersAndSetters(schema, manyToMany, manyToManyName) {
    var aTypeName = manyToMany.entityA;
    var bTypeName = manyToMany.entityB;
    var aType = schema.model[aTypeName];
    var bType = schema.model[bTypeName];
    var aTypeNameCapitalized = _.capitalize(aTypeName);
    var bTypeNameCapitalized = _.capitalize(bTypeName);
    var aPluralSuffix = _.capitalize(pluralise(aType, aTypeName));
    var bPluralSuffix = _.capitalize(pluralise(bType, bTypeName));

    thiz['get' + aTypeNameCapitalized + bPluralSuffix] = _.partial(getsManyToMany, manyToManyName, aTypeName, bTypeName);
    thiz['get' + bTypeNameCapitalized + aPluralSuffix] = _.partial(getsManyToMany, manyToManyName, bTypeName, aTypeName);

    thiz['put' + aTypeNameCapitalized + bPluralSuffix] = _.partial(putsManyToMany, manyToManyName, aTypeName, bTypeName, bType.idProperty);
    thiz['put' + bTypeNameCapitalized + aPluralSuffix] = _.partial(putsManyToMany, manyToManyName, bTypeName, aTypeName, aType.idProperty);
  }

  function initHasManyRelations(schema, type, typeName) {
    hasManyRelations[typeName] = {};
    hasManyTypeNames.forEach(function(hasManyTypeName) {
      hasManyRelations[typeName][hasManyTypeName] = {};
      var getSetSuffix = _.capitalize(typeName) + pluralise(schema[hasManyTypeName], _.capitalize(hasManyTypeName));
      thiz['get' + getSetSuffix] = _.partial(getsHasMany, typeName, hasManyTypeName);
      thiz['put' + getSetSuffix] = x;
    });
  }

  function Cache(type) {
    var cache = {};
    cache.populated = false;
    cache.entities = {};
    cache.idProperty = type.idProperty;
    cache.indexes = {};
    _.each(type.indexOn, function(property) {
      cache.indexes[property] = {};
    });
    return cache;
  }

  function ManyToMany() {
    var manyToMany = {};
    manyToMany.populated = false;
    manyToMany.pairs = [];
    return manyToMany;
  }

  function pluralise(type, typeName) {
    return typeName + (type.pluralSuffix || 's');
  }

  function addGettersAndSettersFor(type, typeName) {
    var typeNameFnSuffix = _.capitalize(typeName);
    var typeNameFnSuffixPlural = pluralise(type, typeNameFnSuffix);

    // add getters for specified id property
    thiz['get' + typeNameFnSuffix] = _.partial(get, typeName);
    thiz['get' + typeNameFnSuffixPlural] = _.partial(gets, typeName);
    thiz['getAll' + typeNameFnSuffixPlural] = _.partial(getAll, typeName);

    // add getters for specified indexOn properties (return single element)
    _.each(type.indexOn, _.partial(addIndexedGetForTypeAndProperty, typeNameFnSuffix, typeName));

    // add getters for specified getBy properties (return array of 0 or more elements)
    _.each(type.getBy, _.partial(addGetsForTypeAndProperty, typeNameFnSuffixPlural, typeName));

    // add getters for specified one-to-many relations
    _.each(type.hasMany, _.partial(addGetsForTypeHasManyRelation, typeNameFnSuffix, typeName));

    // add setters
    thiz['put' + typeNameFnSuffix] = _.partial(putAndInvokeSubscribedActions, typeName);
    thiz['put' + typeNameFnSuffixPlural] = _.partial(putsAndInvokeSubscribedActions, typeName);
  }

  function addIndexedGetForTypeAndProperty(typeNameFnSuffix, typeName, property) {
    thiz['get' + typeNameFnSuffix + 'By' + _.capitalize(property)] = _.partial(getByIndexedProperty, typeName, property);
  }

  function addGetsForTypeAndProperty(typeNameFnSuffixPlural, typeName, property) {
    thiz['get' + typeNameFnSuffixPlural + 'By' + _.capitalize(property)] = _.partial(getsByProperty, typeName, property);
  }

  function addGetsForTypeHasManyRelation(typeNameFnSuffix, typeName, hasManyEntity) {
    thiz['get' + typeNameFnSuffix + 'By' + _.capitalize(property)] = _.partial(getByIndexedProperty, typeName, property);
  }

  function getFromCache(cache, id) {
    return cache.entities[id];
  }

  function get(typeName, id) {
    return getFromCache(caches[typeName], id);
  }

  function gets(typeName, ids) {
    var cache = caches[typeName];
    return arrayResult(_.chain(ids)
                        .map(_.partial(getFromCache, cache))
                        .compact()
                        .value(), cache);
  }

  function getAll(typeName) {
    var cache = caches[typeName];
    return arrayResult(_.values(cache.entities), cache);
  }

  function arrayResult(arr, cache) {
    return arr.length === 0 && !cache.populated ? undefined : arr;
  }

  function getByIndexedProperty(typeName, property, value) {
    var cache = caches[typeName];
    var id = cache.indexes[property][value];
    return cache.entities[id];
  }

  function getsByProperty(typeName, property, value) {
    var cache = caches[typeName];
    return arrayResult(_.filter(cache.entities, looselyEquals(property, value)), cache);
  }

  function getsManyToMany(manyToManyName, fromTypeName, toTypeName, id) {
    var manyToMany = manyToManys[manyToManyName];
    var ids = _.chain(manyToMany.pairs)
                  .filter(looselyEquals(fromTypeName, id))
                  .pluck(toTypeName)
                  .value();
    if(ids.length === 0) {
      if(manyToMany.populated) return ids;
      return;
    }
    return gets(toTypeName, ids);
  }

  function makeManyToManyPair(fromKey, toKey, fromValue, toValue) {
    var newPair = {};
    newPair[fromKey] = fromValue;
    newPair[toKey] = toValue;
    return newPair;
  }

  function putsManyToMany(manyToManyName, fromTypeName, toTypeName, toTypeIdProperty, fromId, toObjects) {
    var newPairs = _.chain(toObjects)
                    .pluck(toTypeIdProperty)
                    .map(_.partial(makeManyToManyPair, fromTypeName, toTypeName, fromId))
                    .value();
    manyToManys[manyToManyName].pairs = newPairs.concat(_.reject(manyToManys[manyToManyName].pairs, looselyEquals(fromTypeName, fromId)));
  }

  function looselyEquals(property, value) {
    return function(obj) {
      return obj[property] == value;
    };
  }

  function put(cache, entity) {
    var id = entity[cache.idProperty];
    cache.entities[id] = entity;
    _.forOwn(cache.indexes, function(index, indexName) {
      index[entity[indexName]] = id;
    });
    return entity;
  }

  function putAndInvokeSubscribedActions(typeName, entity) {
    var cache = caches[typeName];
    var rtn = put(cache, entity);
    cache.populated = true;
    invokeSubscribedActions(typeName);
    return rtn;
  }

  function putsAndInvokeSubscribedActions(typeName, entities) {
    var cache = caches[typeName];
    var rtn = _.map(entities, _.partial(put, cache));
    cache.populated = true;
    invokeSubscribedActions(typeName);
    return rtn;
  }

  function invokeSubscribedActions(typeName) {
    _.invoke(subscriptions[typeName], 'action');
  }

  function subscribe(id) {
    return {
      toDo: function(action) {
        return {
          onUpdatesTo: function(typeName) {
            subscriptions[typeName].push({
              id: id,
              action: action
            });
          },
          onUpdatesToProperty: function(propertyName) {
            subscriptions[getPropertySubscriptionKey(propertyName)].push({
              id: id,
              action: action
            });
          }
        };
      }
    };
  }

  function unsubscribe(id) {
    return {
      fromUpdatesTo: function(typeName) {
        subscriptions[typeName] = _.reject(subscriptions[typeName], looselyEquals('id', id));
      },
      fromUpdatesToProperty: function(propertyName) {
        subscriptions[getPropertySubscriptionKey(propertyName)] = _.reject(subscriptions[getPropertySubscriptionKey(propertyName)], looselyEquals('id', id));
      },
      fromAllUpdates: function() {
        _.each(_.keys(subscriptions), unsubscribe(id).fromUpdatesTo);
        _.each(_.keys(subscriptions), unsubscribe(id).fromUpdatesToProperty);
      }
    };
  }

  function wipe() {
    wipeCaches();
    wipeManyToManys();
    wipeSubscriptions();
    wipeProperties();
  }

  function wipeCaches() {
    _.forOwn(caches, wipeCacheBackup);
    caches = {};
  }

  function wipeCacheBackup(cache, typeName) {
    store.remove(getCacheBackupKey(typeName));
  }

  function wipeManyToManys() {
    _.forOwn(manyToManys, wipeManyToManyBackup);
    manyToManys = {};
  }

  function wipeManyToManyBackup(manyToMany, manyToManyName) {
    store.remove(getManyToManyBackupKey(manyToManyName));
  }

  function wipeSubscriptions() {
    subscriptions = {};
  }

  function wipeProperty(property, propertyName) {
    if(property.doNotWipe) return;
    delete properties[propertyName];
    if(!property.doNotPersist) store.remove(getPropertyBackupKey(propertyName));
  }

  thiz.subscribe = subscribe;
  thiz.unsubscribe = unsubscribe;
  thiz.wipe = wipe;

  init();

  return thiz;
};

module.exports = Maranon;
