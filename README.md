# Raft Workshop Lab

This project accompanies **COMSM0122 Fundamentals of System Security, Workshop 4: Understanding and Stress-Testing Raft**. It uses a simplified JavaScript simulator to explore leader election, heartbeats, log replication, failures, majority requirements, network partitions, and log recovery.

The workshop exercises are supplemented with a majority/minority partition experiment and a follower replication-lag monitor. The project is an educational simulation, not a production-ready Raft implementation.

## Requirements

- Node.js 18 or newer
- npm

All scenarios run locally in the terminal. No server or external service is required. The current package declares no third-party dependencies.

## Setup

Open a terminal in the project root, where `package.json` is located, and run:

```bash
npm install
```

Run the default leader-election scenario:

```bash
npm start
```

Each scenario is a separate process with fresh state. Terms, roles, and logs do not carry over between runs.

## Running the experiments

Run the following commands from the project root:

| Part | Experiment | Command |
| --- | --- | --- |
| 1 | Leader election | `npm run election` |
| 2 | Heartbeats | `npm run heartbeats` |
| 3 | Leader failure and re-election | `npm run leader-failure` |
| 4 | Log replication | `npm run replication` |
| 5 | Follower failure | `npm run follower-failure` |
| 6 | Loss of majority | `npm run majority-lost` |
| 7 | Message loss and network repair | `npm run partition` |
| 7 supplement | Majority and minority partitions | `node scenarios/partition_quorum.js` |
| 8 | Log recovery and content comparison | `npm run recovery` |
| 9 | Operational checks and warnings | `npm run hardening` |
| 10 | Follower replication-lag monitoring | `node scenarios/follower_lag.js` |

The two additional scenarios use direct `node` commands because they are not registered as npm scripts.

## Project structure

```text
raft-lab/
  README.md
  package.json
  package-lock.json
  node.js
  term.js
  logEntry.js
  network.js
  cluster.js
  simulator.js
  scenarios/
    leader_election.js
    heartbeats.js
    leader_failure.js
    log_replication.js
    follower_failure.js
    majority_lost.js
    network_partition.js
    partition_quorum.js
    log_recovery.js
    hardening.js
    follower_lag.js
  report/
    report.pdf
```

`node.js` represents node state, `cluster.js` calculates the majority and tracks nodes, and `simulator.js` provides the original simplified election, heartbeat, and replication operations. `network.js` prints message delivery or loss, while `logEntry.js` defines log-entry data. `term.js` provides a separate term helper; the current scenarios manage node terms directly.

## Changes to the starter project

- Exported `LogEntry` from `logEntry.js`, fixing the constructor error in replication and recovery scenarios.
- Implemented the previously empty heartbeat scenario, showing election results, empty AppendEntries messages, and node roles before and after sending heartbeats.
- Added a content comparison to the recovery scenario, producing `Logs identical: true` after missing entries are copied.
- Added `partition_quorum.js` to demonstrate actual delivery restrictions between two node groups and their effects on elections and commitment.
- Added `follower_lag.js` to detect excessive replication lag and demonstrate monitoring before and after a separate recovery step.

## Part 7 supplementary partition experiment

The experiment begins with five connected nodes and a majority requirement of three. A becomes leader in term 1 and commits `instances=10`.

The network then separates into `[A, B]` and `[C, D, E]`, with all nodes still online. Cross-partition messages are dropped, while messages within each group can be delivered. The majority threshold remains three.

- C receives three votes and becomes leader in term 2.
- A receives only two acknowledgements for `instances=20`; this entry remains uncommitted.
- C receives three acknowledgements for `instances=30`; this entry is committed.

The script checks its expected outcomes using Node.js assertions and prints:

```text
PASS: Minority update stayed uncommitted; majority update committed.
```

A can still display the Leader role in the isolated minority. This does not allow it to commit independently. The scenario uses its own synchronous election, message-delivery, and replication logic rather than modifying the original simulator. It does not demonstrate partition healing or subsequent log reconciliation.

## Part 10 follower-lag monitor

`checkFollowerLag(leader, follower, threshold)` calculates the difference between the nodes' last log indexes. An empty log uses index zero. The default threshold is two entries.

| Condition | Status |
| --- | --- |
| Gap exceeds the threshold | `WARNING` |
| Positive gap within the threshold | `WITHIN_THRESHOLD` |
| Gap is zero | `CAUGHT_UP` |
| Follower index exceeds leader index | `CHECK_REQUIRED` |

The demonstration starts with leader index 5 and follower index 2. The gap of three triggers a warning. A separate recovery loop copies entries 3, 4, and 5. The next check reports a zero gap, and an independent content comparison confirms identical logs.

The monitor returns measurements and a status without modifying logs. It detects lag; it does not automatically repair followers. Equal indexes alone do not prove that log contents match.

## Limitations

- The original simulator automatically counts online peers as voters and replication acknowledgements. It does not implement the full Raft protocol or make successful delivery a prerequisite for those counts.
- Heartbeat messages are printed, but receipt handling and election timers are not implemented. Leader failures and election triggers are scripted.
- Some scenarios assign a leader directly, so a leader may start in term zero. The original leader-failure scenario does not clear the failed node's stored Leader role.
- The majority-loss scenario checks the online-node count and prints conclusions rather than attempting elections or replication.
- Logs are held in memory. There is no durable storage, restart recovery, snapshotting, or replicated application state machine.
- Recovery examples assume an already matching log prefix and append missing entries. They do not implement general conflict reconciliation.
- Operational checks use illustrative thresholds and fixed inputs. They are not continuous monitoring of a live deployment.

## Report

The [workshop report](report/report.pdf) contains screenshots, explanations, reflection answers, and the Part 10 enhancement details. Part 9 refers to Part 10 for the implemented follower-lag demonstration.

## Acknowledgements

The starter simulator and workshop materials were provided for COMSM0122 by Dr Inah Omoronyia. The modifications and supplementary experiments described above build on that teaching code. The supplied `package.json` declares the ISC license.
