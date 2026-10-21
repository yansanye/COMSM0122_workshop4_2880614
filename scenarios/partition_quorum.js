const assert = require("node:assert/strict");
const Node = require("../node");

// A synchronous teaching scenario: no timers, disk storage or full recovery.
const nodes = ["A", "B", "C", "D", "E"].map(id => new Node(id));
const majority = Math.floor(nodes.length / 2) + 1;
for (const node of nodes) node.commitIndex = 0;
let partitioned = false;
const group = node => ["A", "B"].includes(node.id) ? 0 : 1;

function send(from, to, message, verbose = true) {
    const delivered = from.online && to.online &&
        (!partitioned || group(from) === group(to));
    if (verbose || !delivered) {
        console.log(`${delivered ? "DELIVERED" : "DROPPED"}: ${from.id} -> ${to.id} ${message}`);
    }
    return delivered;
}

function adoptTerm(node, term) {
    if (term > node.currentTerm) {
        node.currentTerm = term;
        node.votedFor = null;
        node.role = "FOLLOWER";
    }
}

function elect(candidate) {
    candidate.becomeCandidate();
    let votes = 1;
    for (const peer of nodes) {
        if (peer === candidate || !send(candidate, peer, "RequestVote")) continue;
        adoptTerm(peer, candidate.currentTerm);
        if (peer.currentTerm > candidate.currentTerm) {
            adoptTerm(candidate, peer.currentTerm);
            return false;
        }
        const last = candidate.log.at(-1) || { term: 0, index: 0 };
        const peerLast = peer.log.at(-1) || { term: 0, index: 0 };
        const upToDate = last.term > peerLast.term ||
            (last.term === peerLast.term && last.index >= peerLast.index);
        if (upToDate && (peer.votedFor === null || peer.votedFor === candidate.id)) {
            peer.votedFor = candidate.id;
            if (send(peer, candidate, "VoteGranted", false)) votes++;
        }
    }
    console.log(`Votes for ${candidate.id}: ${votes}/${nodes.length}; required: ${majority}`);
    if (votes < majority) return false;
    candidate.becomeLeader();
    return true;
}

function replicate(leader, command) {
    assert.equal(leader.role, "LEADER");
    const previous = leader.log.at(-1) || { index: 0, term: 0 };
    const entry = { index: previous.index + 1, term: leader.currentTerm, command };
    leader.log.push(entry);
    let acknowledgements = 1;

    for (const peer of nodes) {
        if (peer === leader || !send(leader, peer, `AppendEntries(${command})`)) continue;
        if (peer.currentTerm > leader.currentTerm) {
            adoptTerm(leader, peer.currentTerm);
            console.log("Leader stepped down after discovering a higher term");
            return false;
        }
        adoptTerm(peer, leader.currentTerm);
        peer.role = "FOLLOWER";
        const matchingPrefix = previous.index === 0 ||
            peer.log[previous.index - 1]?.term === previous.term;
        if (!matchingPrefix) continue;
        // This demonstration only appends after a matching prefix.
        assert.ok(entry.index > peer.commitIndex, "Never overwrite committed history");
        peer.log = peer.log.slice(0, previous.index);
        peer.log.push({ ...entry });
        if (send(peer, leader, "AppendEntries ACK", false)) acknowledgements++;
    }

    const committed = acknowledgements >= majority;
    if (committed) {
        leader.commitIndex = entry.index;
        // A further successful notification communicates the commit index.
        for (const peer of nodes) {
            if (peer !== leader && send(leader, peer, "Commit notification", false)) {
                peer.commitIndex = Math.min(entry.index, peer.log.length);
            }
        }
    }
    console.log(`${leader.id}: acknowledgements ${acknowledgements}/${nodes.length}; ` +
        `${committed ? "COMMITTED" : "NOT COMMITTED"}: ${command}`);
    return committed;
}

console.log("PART 7: NETWORK PARTITION AND MAJORITY AGREEMENT");
console.log(`Configured nodes: 5; majority required: ${majority}`);
console.log("\nBefore partition:");
assert.equal(elect(nodes[0]), true);
assert.equal(replicate(nodes[0], "instances=10"), true);

partitioned = true;
console.log("\nPARTITION ACTIVE: [A, B] | [C, D, E]");
console.log("All five nodes remain online. The majority threshold stays at 3.");

console.log("\nMajority side elects a replacement leader:");
assert.equal(elect(nodes[2]), true);

console.log("\nMinority side tries to commit using its old leader:");
assert.equal(replicate(nodes[0], "instances=20"), false);

console.log("\nMajority side tries to commit using its new leader:");
assert.equal(replicate(nodes[2], "instances=30"), true);

console.log("\nRESULT:");
for (const node of nodes) {
    const committedCommands = node.log.slice(0, node.commitIndex).map(e => e.command);
    console.log(`${node.id}: term=${node.currentTerm}, role=${node.role}, ` +
        `committed=${JSON.stringify(committedCommands)}`);
    assert.deepEqual(committedCommands, group(node) === 0
        ? ["instances=10"] : ["instances=10", "instances=30"]);
}
console.log("PASS: Minority update stayed uncommitted; majority update committed.");
console.log("Scope: scripted elections and synchronous delivery; no partition-healing simulation.");
