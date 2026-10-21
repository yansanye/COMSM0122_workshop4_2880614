const Node = require("../node");

// This educational monitor compares log positions, not log contents.
function checkFollowerLag(leader, follower, threshold = 2) {
    if (!Number.isInteger(threshold) || threshold < 0) {
        throw new Error("Lag threshold must be a non-negative integer");
    }

    const leaderIndex = leader.log.length === 0
        ? 0 : leader.log[leader.log.length - 1].index;
    const followerIndex = follower.log.length === 0
        ? 0 : follower.log[follower.log.length - 1].index;
    const lag = leaderIndex - followerIndex;
    const status = lag < 0 ? "CHECK_REQUIRED"
        : lag > threshold ? "WARNING"
        : lag === 0 ? "CAUGHT_UP" : "WITHIN_THRESHOLD";

    console.log(`Follower: ${follower.id}`);
    console.log(`Leader last log index: ${leaderIndex}`);
    console.log(`Follower last log index: ${followerIndex}`);
    console.log(`Index gap: ${lag}`);
    console.log(`Warning threshold: more than ${threshold} entries`);

    if (status === "WARNING") {
        console.log("WARNING: Follower replication lag exceeds threshold");
    } else if (status === "CAUGHT_UP") {
        console.log("OK: Follower has caught up by log index");
    } else if (status === "CHECK_REQUIRED") {
        console.log("CHECK REQUIRED: Follower index exceeds leader index");
    } else {
        console.log("NOTICE: Follower is behind but within threshold");
    }

    return { leaderIndex, followerIndex, lag, status };
}

function runDemo() {
    console.log("\nPART 10: FOLLOWER REPLICATION LAG MONITORING");
    const leader = new Node("A");
    const follower = new Node("B");
    leader.role = "LEADER";
    leader.currentTerm = 1;
    follower.currentTerm = 1;

    leader.log = ["A", "B", "C", "D", "E"].map((command, i) => ({
        index: i + 1, term: 1, command
    }));
    follower.log = leader.log.slice(0, 2).map(entry => ({ ...entry }));

    console.log("\nBefore recovery:");
    checkFollowerLag(leader, follower, 2);

    // Manual recovery is separate from monitoring. It assumes a matching prefix.
    console.log("\nSimulating recovery of missing entries:");
    for (const entry of leader.log.slice(follower.log.length)) {
        follower.log.push({ ...entry });
        console.log(`Recovered entry ${entry.index}`);
    }

    console.log("\nAfter recovery:");
    checkFollowerLag(leader, follower, 2);
    console.log("Logs identical:",
        JSON.stringify(leader.log) === JSON.stringify(follower.log));
}

if (require.main === module) runDemo();

module.exports = { checkFollowerLag };
