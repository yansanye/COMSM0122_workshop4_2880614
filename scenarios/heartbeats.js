const Node = require("../node");
const Cluster = require("../cluster");
const Simulator = require("../simulator");
const Network = require("../network");

const nodes = [new Node("A"), new Node("B"), new Node("C")];
const simulator = new Simulator(
    new Cluster(nodes),
    new Network()
);

console.log("\nSCENARIO: HEARTBEATS");
simulator.electLeader(nodes[1]);

console.log("\nRoles before heartbeats:");
nodes.forEach(node => console.log(`${node.id}: ${node.role}`));

console.log("\nSending heartbeats:");
simulator.heartbeat();

console.log("\nRoles after heartbeats:");
nodes.forEach(node => console.log(`${node.id}: ${node.role}`));