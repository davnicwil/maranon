var expect = require("chai").expect;
var Maranon = require("../maranon.js");

var schema = {
  "person" : {
    "idProperty": "personId",
    "indexOn": ["username", "email"],
    "getBy": ["age"]
  }, // person:house 1:n
  "house" : {
    "idProperty": "houseId"
  }, // house:room 1:n
  "room" : {
    "idProperty": "roomId"
  }
};


describe('When I build a Maranon cache with a schema containing person, house and room', function() {

  var testObj = Maranon(schema);

  it('should provide basic getters and setters for the person cache', function () {
    expect(testObj).to.have.property('getPerson');
    expect(testObj.getPerson).to.be.a('function');

    expect(testObj).to.have.property('getPersons');
    expect(testObj.getPersons).to.be.a('function');

    expect(testObj).to.have.property('getAllPersons');
    expect(testObj.getAllPersons).to.be.a('function');

    expect(testObj).to.have.property('putPerson');
    expect(testObj.putPerson).to.be.a('function');

    expect(testObj).to.have.property('putPersons');
    expect(testObj.putPersons).to.be.a('function');
  });

  it('should provide getters for the username and email properties on person, as these were specified as indexed props in the schema', function() {
    expect(testObj).to.have.property('getPersonByUsername');
    expect(testObj.getPersonByUsername).to.be.a('function');

    expect(testObj).to.have.property('getPersonByEmail');
    expect(testObj.getPersonByEmail).to.be.a('function');
  });

  it('should provide a getter for the age property on person, as this was specified as a getBy prop in the schema', function() {
    expect(testObj).to.have.property('getPersonsByAge');
    expect(testObj.getPersonsByAge).to.be.a('function');
  });

  it('should provide basic getters and setters for the house cache', function () {
    expect(testObj).to.have.property('getHouse');
    expect(testObj.getHouse).to.be.a('function');

    expect(testObj).to.have.property('getHouses');
    expect(testObj.getHouses).to.be.a('function');

    expect(testObj).to.have.property('getAllHouses');
    expect(testObj.getAllHouses).to.be.a('function');

    expect(testObj).to.have.property('putHouse');
    expect(testObj.putHouse).to.be.a('function');

    expect(testObj).to.have.property('putHouses');
    expect(testObj.putHouses).to.be.a('function');
  });

  it('it should provide basic getters and setters for the room cache', function () {
    expect(testObj).to.have.property('getRoom');
    expect(testObj.getRoom).to.be.a('function');

    expect(testObj).to.have.property('getRooms');
    expect(testObj.getRooms).to.be.a('function');

    expect(testObj).to.have.property('getAllRooms');
    expect(testObj.getAllRooms).to.be.a('function');

    expect(testObj).to.have.property('putRoom');
    expect(testObj.putRoom).to.be.a('function');

    expect(testObj).to.have.property('putRooms');
    expect(testObj.putRooms).to.be.a('function');
  });

  it('it should store a person object', function() {
    testObj.putPerson({
      personId: 1,
      name: 'tom jones',
      age: 30,
      username: 'tomjones123',
      email: 'tom@jones.com'
    });

    expect(testObj.getPerson(1)).to.be.an('object');

    expect(testObj.getPerson(1)).to.have.property('personId');
    expect(testObj.getPerson(1)).to.have.property('name');
    expect(testObj.getPerson(1)).to.have.property('username');
    expect(testObj.getPerson(1)).to.have.property('email');

    expect(testObj.getPerson(1).personId).to.equal(1);
    expect(testObj.getPerson(1).name).to.equal('tom jones');
    expect(testObj.getPerson(1).username).to.equal('tomjones123');
    expect(testObj.getPerson(1).email).to.equal('tom@jones.com');
  });

  it('it should index a person object by username', function() {
    expect(testObj.getPersonByUsername('tomjones123')).to.be.an('object');

    expect(testObj.getPersonByUsername('tomjones123')).to.have.property('personId');
    expect(testObj.getPersonByUsername('tomjones123')).to.have.property('name');
    expect(testObj.getPersonByUsername('tomjones123')).to.have.property('username');
    expect(testObj.getPersonByUsername('tomjones123')).to.have.property('email');

    expect(testObj.getPersonByUsername('tomjones123').personId).to.equal(1);
    expect(testObj.getPersonByUsername('tomjones123').name).to.equal('tom jones');
    expect(testObj.getPersonByUsername('tomjones123').username).to.equal('tomjones123');
    expect(testObj.getPersonByUsername('tomjones123').email).to.equal('tom@jones.com');
  });

  it('it should index a person object by email', function() {
    expect(testObj.getPersonByEmail('tom@jones.com')).to.be.an('object');

    expect(testObj.getPersonByEmail('tom@jones.com')).to.have.property('personId');
    expect(testObj.getPersonByEmail('tom@jones.com')).to.have.property('name');
    expect(testObj.getPersonByEmail('tom@jones.com')).to.have.property('username');
    expect(testObj.getPersonByEmail('tom@jones.com')).to.have.property('email');

    expect(testObj.getPersonByEmail('tom@jones.com').personId).to.equal(1);
    expect(testObj.getPersonByEmail('tom@jones.com').name).to.equal('tom jones');
    expect(testObj.getPersonByEmail('tom@jones.com').username).to.equal('tomjones123');
    expect(testObj.getPersonByEmail('tom@jones.com').email).to.equal('tom@jones.com');
  });

  it('it should store a house object', function() {
    testObj.putHouse({
      houseId: 100,
      address: '1 gumdrop lane',
      ownerId: 1
    });

    expect(testObj.getHouse(100)).to.be.an('object');

    expect(testObj.getHouse(100)).to.have.property('houseId');
    expect(testObj.getHouse(100)).to.have.property('address');
    expect(testObj.getHouse(100)).to.have.property('ownerId');

    expect(testObj.getHouse(100).houseId).to.equal(100);
    expect(testObj.getHouse(100).address).to.equal('1 gumdrop lane');
    expect(testObj.getHouse(100).ownerId).to.equal(1);
  });

  it('it should store a room object', function() {
    testObj.putRoom({
      roomId: 1000,
      name: 'kitchen',
      houseId: 100
    });

    expect(testObj.getRoom(1000)).to.be.an('object');

    expect(testObj.getRoom(1000)).to.have.property('roomId');
    expect(testObj.getRoom(1000)).to.have.property('name');
    expect(testObj.getRoom(1000)).to.have.property('houseId');

    expect(testObj.getRoom(1000).roomId).to.equal(1000);
    expect(testObj.getRoom(1000).name).to.equal('kitchen');
    expect(testObj.getRoom(1000).houseId).to.equal(100);
  });

  it('it should allow relational gets to be done, since everything is cached', function() {

    // get the house from the room
    expect(testObj.getHouse(testObj.getRoom(1000).houseId)).to.be.an('object');

    expect(testObj.getHouse(testObj.getRoom(1000).houseId)).to.have.property('houseId');
    expect(testObj.getHouse(testObj.getRoom(1000).houseId)).to.have.property('address');
    expect(testObj.getHouse(testObj.getRoom(1000).houseId)).to.have.property('ownerId');

    expect(testObj.getHouse(testObj.getRoom(1000).houseId).houseId).to.equal(100);
    expect(testObj.getHouse(testObj.getRoom(1000).houseId).address).to.equal('1 gumdrop lane');
    expect(testObj.getHouse(testObj.getRoom(1000).houseId).ownerId).to.equal(1);

    // get the owner from the house from the room
    expect(testObj.getPerson(testObj.getHouse(testObj.getRoom(1000).houseId).ownerId)).to.be.an('object');

    expect(testObj.getPerson(testObj.getHouse(testObj.getRoom(1000).houseId).ownerId)).to.have.property('personId');
    expect(testObj.getPerson(testObj.getHouse(testObj.getRoom(1000).houseId).ownerId)).to.have.property('name');
    expect(testObj.getPerson(testObj.getHouse(testObj.getRoom(1000).houseId).ownerId)).to.have.property('username');
    expect(testObj.getPerson(testObj.getHouse(testObj.getRoom(1000).houseId).ownerId)).to.have.property('email');

    expect(testObj.getPerson(testObj.getHouse(testObj.getRoom(1000).houseId).ownerId).personId).to.equal(1);
    expect(testObj.getPerson(testObj.getHouse(testObj.getRoom(1000).houseId).ownerId).name).to.equal('tom jones');
    expect(testObj.getPerson(testObj.getHouse(testObj.getRoom(1000).houseId).ownerId).username).to.equal('tomjones123');
    expect(testObj.getPerson(testObj.getHouse(testObj.getRoom(1000).houseId).ownerId).email).to.equal('tom@jones.com');
  });

  it('it should allow you to add multiple people, and get an array of all people cached', function() {

    // add a single extra person
    testObj.putPerson({
      personId: 2,
      name: 'jack white',
      age: 32,
      username: 'jack',
      email: 'jack@white.com'
    });

    // add multiple extra people at once
    testObj.putPersons([
      {
        personId: 3,
        name: 'joe bloggs',
        age: 30,
        username: 'joe',
        email: 'joe@bloggs.com'
      },
      {
        personId: 4,
        name: 'jim smith',
        age: 31,
        username: 'jim',
        email: 'jim@smith.com'
      },
      {
        personId: 5,
        name: 'mike johnson',
        age: 32,
        username: 'mike',
        email: 'mike@johnson.com'
      }
    ]);

    expect(testObj.getAllPersons()).to.be.an('array');
    expect(testObj.getAllPersons().length).to.equal(5);

    var peopleSortedById = testObj.getAllPersons().sort(function(a, b) {
      return a.personId - b.personId;
    });

    expect(peopleSortedById[0].name).to.equal('tom jones');
    expect(peopleSortedById[1].name).to.equal('jack white');
    expect(peopleSortedById[2].name).to.equal('joe bloggs');
    expect(peopleSortedById[3].name).to.equal('jim smith');
    expect(peopleSortedById[4].name).to.equal('mike johnson');
  });

  it('it should allow you to retrieve a subset of people cached, by their ids', function() {

    expect(testObj.getPersons([1,3,5])).to.be.an('array');
    expect(testObj.getPersons([1,3,5]).length).to.equal(3);

    var subsetSortedById = testObj.getPersons([1,3,5]).sort(function(a, b) {
      return a.personId - b.personId;
    });

    expect(subsetSortedById[0].name).to.equal('tom jones');
    expect(subsetSortedById[1].name).to.equal('joe bloggs');
    expect(subsetSortedById[2].name).to.equal('mike johnson');
  });

  it('it should allow you to retrieve a subset of people cached, by their age', function() {
    expect(testObj.getPersonsByAge(30)).to.be.an('array');
    expect(testObj.getPersonsByAge(30).length).to.equal(2);

    var subsetOneSortedById = testObj.getPersonsByAge(30).sort(function(a, b) {
      return a.personId - b.personId;
    });

    expect(subsetOneSortedById[0].name).to.equal('tom jones');
    expect(subsetOneSortedById[1].name).to.equal('joe bloggs');

    expect(testObj.getPersonsByAge(32)).to.be.an('array');
    expect(testObj.getPersonsByAge(32).length).to.equal(2);

    var subsetTwoSortedById = testObj.getPersonsByAge(32).sort(function(a, b) {
      return a.personId - b.personId;
    });

    expect(subsetTwoSortedById[0].name).to.equal('jack white');
    expect(subsetTwoSortedById[1].name).to.equal('mike johnson');
  });

  it('it should allow me to subsrcibe and unsubscribe actions to problem updates', function() {
    var x = 0;
    function incrementX() {
      x += 1;
    }

    testObj.subscribe("someId", "person", incrementX);

    expect(x).to.equal(0);

    testObj.putPerson({
      personId: 6,
      name: 'usain bolt',
      age: 30,
      username: 'usainbolt123',
      email: 'usain@bolt.com'
    });

    // subscribed action incrementX should have been called once on putPerson call
    expect(x).to.equal(1);

    testObj.putPersons([
      {
        personId: 7,
        name: 'james bond',
        age: 35,
        username: 'jamesbond123',
        email: 'james@bond.com'
      },
      {
        personId: 8,
        name: 'hermione granger',
        age: 20,
        username: 'hermione123',
        email: 'hermione@granger.com'
      }
    ]);

    // subscribed action incrementX should have been called once on putPersons call
    expect(x).to.equal(2);

    // test that typename specific unsubscribe works
    testObj.unsubscribe("someId", "person");

    testObj.putPerson({
      personId: 9,
      name: 'jane smith',
      age: 30,
      username: 'jane123',
      email: 'jane@smith.com'
    });

    // unsubscribed action incrementX so x should not have incremented with putPerson call
    expect(x).to.equal(2);

    testObj.putPersons([
      {
        personId: 10,
        name: 'tom smith',
        age: 30,
        username: 'tomsmith123',
        email: 'tom@smith.com'
      },
      {
        personId: 11,
        name: 'sarah jones',
        age: 25,
        username: 'sjones123',
        email: 'sarah@jones.com'
      }
    ]);

    // unsubscribed action incrementX so x should not have incremented with putPersons call
    expect(x).to.equal(2);

    // re-subscribe incrementX
    testObj.subscribe("someId", "person", incrementX);

    testObj.putPerson({
      personId: 12,
      name: 'michelle jones',
      age: 31,
      username: 'michellejones123',
      email: 'michelle@jones.com'
    });
    expect(x).to.equal(3);

    testObj.putPersons([
      {
        personId: 13,
        name: 'josh james',
        age: 31,
        username: 'joshjames123',
        email: 'josh@james.com'
      },
      {
        personId: 14,
        name: 'kate smith',
        age: 29,
        username: 'katesmith123',
        email: 'kate@smith.com'
      }
    ]);
    expect(x).to.equal(4);

    // check unsubcribe from all types works
    testObj.unsubscribeAll("someId");

    testObj.putPerson({
      personId: 15,
      name: 'jane jones',
      age: 30,
      username: 'janejone100',
      email: 'jane@jones.com'
    });
    expect(x).to.equal(4);

    testObj.putPersons([
      {
        personId: 16,
        name: 'jim bond',
        age: 45,
        username: 'jimbond123',
        email: 'jim@bond.com'
      },
      {
        personId: 17,
        name: 'charles smith',
        age: 26,
        username: 'charlessmith',
        email: 'charles@smith.com'
      }
    ]);
    expect(x).to.equal(4);
  });
});
