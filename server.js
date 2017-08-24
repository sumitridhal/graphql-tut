var express = require('express');
var graphqlHTTP = require('express-graphql');
var {
  graphql,
  buildSchema
} = require('graphql');
// const session = require('express-session');

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
input MessageInput {
  content: String
  author: String
}

type Message {
  id: ID!
    content: String
  author: String
}

type RandomDie {
  numSides: Int!
    rollOnce: Int!
    roll(numRolls: Int!): [Int]
}

type Mutation {
  createMessage(input: MessageInput): Message
  updateMessage(id: ID!, input: MessageInput): Message
}

type User {
  id: String
  name: String
}

type Query {
  quoteOfTheDay: String,
  random: Float!,
  rollDice(numDice: Int!, numSides: Int): [Int],
  getDie(numSides: Int): RandomDie,
  getMessage(id: ID!): Message,
  user(id: String): User,
  ip: String
}
`);

function loggingMiddleware(req, res, next) {
  console.log('ip:', req.ip);
  next();
}

// This class implements the RandomDie GraphQL type
class RandomDie {
  constructor(numSides) {
    this.numSides = numSides;
  }

  rollOnce() {
    return 1 + Math.floor(Math.random() * this.numSides);
  }

  roll({
    numRolls
  }) {
    var output = [];
    for (var i = 0; i < numRolls; i++) {
      output.push(this.rollOnce());
    }
    return output;
  }
}


// If Message had any complex fields, we'd put them on this object.
class Message {
  constructor(id, {
    content,
    author
  }) {
    this.id = id;
    this.content = content;
    this.author = author;
  }
}
// Maps username to conten
var fakeDatabase = {};
// Maps id to User object
var fakeUserDatabase = {
  'a': {
    id: 'a',
    name: 'alice',
  },
  'b': {
    id: 'b',
    name: 'bob',
  },
};



// The root provides a resolver function for each API endpoint
var root = {
  quoteOfTheDay: () => {
    return Math.random() < 0.5 ? 'Take it easy' : 'Salvation lies within';
  },
  random: () => {
    return Math.random();
  },
  rollDice: function({
    numDice,
    numSides
  }) {
    var output = [];
    for (var i = 0; i < numDice; i++) {
      output.push(1 + Math.floor(Math.random() * (numSides || 6)));
    }
    return output;
  },
  getDie: function({
    numSides
  }) {
    return new RandomDie(numSides || 6);
  },
  getMessage: function({
    id
  }) {
    if (!fakeDatabase[id]) {
      throw new Error('no message exists with id ' + id);
    }
    return new Message(id, fakeDatabase[id]);
  },
  createMessage: function({
    input
  }) {
    // Create a random id for our "database".
    var id = require('crypto').randomBytes(10).toString('hex');

    fakeDatabase[id] = input;
    return new Message(id, input);
  },
  updateMessage: function({
    id,
    input
  }) {
    if (!fakeDatabase[id]) {
      throw new Error('no message exists with id ' + id);
    }
    // This replaces all old data, but some apps might want partial update.
    fakeDatabase[id] = input;
    return new Message(id, input);
  },
  ip: function(args, request) {
    return request.ip;
  },
  user: function({
    id
  }) {
    return fakeUserDatabase[id];
  }
};

var app = express();
// app.set('trust proxy', 1) // trust first proxy
// app.use(session({
//   secret: 'keyboard cat',
//   resave: false,
//   saveUninitialized: true,
//   cookie: {
//     secure: true,
//     maxAge: 60000
//   }
// }));

app.use('/graphql', graphqlHTTP(request => {
  const startTime = Date.now();
  return {
    schema: schema,
    rootValue: root,
    graphiql: true,
    extensions({
      document,
      variables,
      operationName,
      result
    }) {
      return {
        runTime: Date.now() - startTime
      };
    }
  }
}));
app.listen(4000);
console.log('Running a GraphQL API server at localhost:4000/graphql');
