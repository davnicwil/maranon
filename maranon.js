var _ = require('lodash');

var Maranon = function(schema) {
  var caches = {};
  var manyToManys = {};
  var subscriptions = {};
  var thiz = {};

  function init() {
    _.forOwn(schema, initTypeCache);
    _.forOwn(schema.manyToMany, _.partial(initManyToMany, schema));
  }

  function initTypeCache(type, typeName) {
    caches[typeName] = Cache(type);
    subscriptions[typeName] = [];
    addGettersAndSettersFor(type, typeName);
  }

  function initManyToMany(schema, manyToMany, manyToManyName) {
    manyToManys[manyToManyName] = new ManyToMany();
    addManyToManyGettersAndSetters(schema, manyToMany, manyToManyName);
  }

  function addManyToManyGettersAndSetters(schema, manyToMany, manyToManyName) {
    var aTypeName = manyToMany.entityA;
    var bTypeName = manyToMany.entityB;
    var aType = schema(aTypeName);
    var bType = schema(bTypeName);
    var aTypeNameCapitalized = _.captialize(aTypeName);
    var bTypeNameCapitalized = _.captialize(bTypeName);
    var aPluralSuffix = _.captialize(pluralise(aType, aTypeName));
    var bPluralSuffix = _.captialize(pluralise(bType, bTypeName));

    thiz['get' + aTypeNameCapitalized + bPluralSuffix] = _.partial(getsManyToMany, manyToManyName, aTypeName, bTypeName);
    thiz['get' + bTypeNameCapitalized + aPluralSuffix] = _.partial(getsManyToMany, manyToManyName, bTypeName, aTypeName);

    thiz['put' + aTypeNameCapitalized + bPluralSuffix] = _.partial(putsManyToMany, manyToManyName, aTypeName, bTypeName);
    thiz['put' + bTypeNameCapitalized + aPluralSuffix] = _.partial(putsManyToMany, manyToManyName, bTypeName, aTypeName);
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
    var ids = _.chain(manyToManys[manyToManyName].pairs)
                  .filter(looselyEquals(fromTypeName, id))
                  .pluck(toTypeName)
                  .value();
    return gets(toTypeName, ids);
  }

  function putsManyToMany(manyToManyName, fromTypeName, toTypeName, toTypeIdProperty, fromId, toObjects) {
    var expiredPairsRemoved = _.filter(manyToManys[manyToManyName].pairs, function(pair) {
      return pair[fromTypeName] != id;
    });
    var newPairs = _.chain(toObjects)
                    .pluck(toTypeIdProperty)
                    .map(function(toId) {
                      var newPair = {};
                      newPair[fromTypeName] = fromId;
                      newPair[toTypeName] = toId;
                      return newPair;
                    })
                    .value();
    manyToManys[manyToManyName].pairs = expiredPairsRemoved.concat(newPairs);
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
      fromAllUpdates: function() {
        _.each(_.keys(subscriptions), unsubscribe(id).fromUpdatesTo);
      }
    };
  }

  function wipe() {
    caches = {};
    hasManyRelations = {};
    subscriptions = {};
  }

  thiz.subscribe = subscribe;
  thiz.unsubscribe = unsubscribe;
  thiz.wipe = wipe;

  init();

  return thiz;
};

module.exports = Maranon;
