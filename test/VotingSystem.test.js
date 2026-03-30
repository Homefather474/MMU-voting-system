const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VotingSystem", function () {
  let votingSystem;
  let admin, voter1, voter2, voter3, outsider;

  beforeEach(async function () {
    [admin, voter1, voter2, voter3, outsider] = await ethers.getSigners();
    const VotingSystem = await ethers.getContractFactory("VotingSystem");
    votingSystem = await VotingSystem.deploy("Test Election", "A test election for unit testing");
    await votingSystem.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set correct admin", async function () {
      expect(await votingSystem.electionAdmin()).to.equal(admin.address);
    });

    it("should start with NotStarted status", async function () {
      expect(await votingSystem.electionStatus()).to.equal(0); // NotStarted
    });

    it("should store election metadata", async function () {
      const info = await votingSystem.getElectionInfo();
      expect(info[0]).to.equal("Test Election");
      expect(info[1]).to.equal("A test election for unit testing");
    });
  });

  describe("Candidate Management", function () {
    it("should allow admin to add candidates", async function () {
      await votingSystem.addCandidate(1, "Jane Wanjiku", "President");
      await votingSystem.addCandidate(2, "James Ochieng", "President");
      expect(await votingSystem.candidateCount()).to.equal(2);
    });

    it("should prevent duplicate candidate IDs", async function () {
      await votingSystem.addCandidate(1, "Jane", "President");
      await expect(votingSystem.addCandidate(1, "James", "President"))
        .to.be.revertedWith("Candidate already exists");
    });

    it("should prevent non-admin from adding candidates", async function () {
      await expect(votingSystem.connect(voter1).addCandidate(1, "Jane", "President"))
        .to.be.revertedWith("Not authorised");
    });
  });

  describe("Voter Registration", function () {
    beforeEach(async function () {
      await votingSystem.addCandidate(1, "Jane", "President");
      await votingSystem.addCandidate(2, "James", "President");
      await votingSystem.startRegistration();
    });

    it("should allow admin to register voters", async function () {
      await votingSystem.registerVoter(voter1.address);
      const status = await votingSystem.verifyVoterStatus(voter1.address);
      expect(status[0]).to.be.true;  // isRegistered
      expect(status[1]).to.be.false; // hasVoted
    });

    it("should support batch voter registration", async function () {
      await votingSystem.registerVotersBatch([voter1.address, voter2.address, voter3.address]);
      expect(await votingSystem.registeredVoterCount()).to.equal(3);
    });

    it("should prevent duplicate registration", async function () {
      await votingSystem.registerVoter(voter1.address);
      await expect(votingSystem.registerVoter(voter1.address))
        .to.be.revertedWith("Voter already registered");
    });
  });

  describe("Vote Casting", function () {
    beforeEach(async function () {
      await votingSystem.addCandidate(1, "Jane", "President");
      await votingSystem.addCandidate(2, "James", "President");
      await votingSystem.startRegistration();
      await votingSystem.registerVoter(voter1.address);
      await votingSystem.registerVoter(voter2.address);
      await votingSystem.openPolls();
    });

    it("should allow registered voter to cast a vote", async function () {
      await votingSystem.connect(voter1).castVote(1);
      const status = await votingSystem.verifyVoterStatus(voter1.address);
      expect(status[1]).to.be.true; // hasVoted
      expect(await votingSystem.totalVotes()).to.equal(1);
    });

    it("should prevent double voting", async function () {
      await votingSystem.connect(voter1).castVote(1);
      await expect(votingSystem.connect(voter1).castVote(2))
        .to.be.revertedWith("Already voted");
    });

    it("should prevent unregistered voters from voting", async function () {
      await expect(votingSystem.connect(outsider).castVote(1))
        .to.be.revertedWith("Not a registered voter");
    });

    it("should prevent voting for non-existent candidates", async function () {
      await expect(votingSystem.connect(voter1).castVote(99))
        .to.be.revertedWith("Candidate does not exist");
    });

    it("should emit VoteCast event", async function () {
      await expect(votingSystem.connect(voter1).castVote(1))
        .to.emit(votingSystem, "VoteCast")
        .withArgs(1, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1) || expect.anything());
    });

    it("should correctly tally votes", async function () {
      await votingSystem.connect(voter1).castVote(1);
      await votingSystem.connect(voter2).castVote(1);
      expect(await votingSystem.totalVotes()).to.equal(2);
    });
  });

  describe("Election Lifecycle", function () {
    beforeEach(async function () {
      await votingSystem.addCandidate(1, "Jane", "President");
      await votingSystem.addCandidate(2, "James", "President");
    });

    it("should follow correct phase transitions", async function () {
      // NotStarted -> Registration
      await votingSystem.startRegistration();
      expect(await votingSystem.electionStatus()).to.equal(1);

      await votingSystem.registerVoter(voter1.address);

      // Registration -> Voting
      await votingSystem.openPolls();
      expect(await votingSystem.electionStatus()).to.equal(2);

      // Cast a vote
      await votingSystem.connect(voter1).castVote(1);

      // Voting -> Ended
      await votingSystem.closePolls();
      expect(await votingSystem.electionStatus()).to.equal(3);

      // Ended -> ResultsPublished
      await votingSystem.publishResults();
      expect(await votingSystem.electionStatus()).to.equal(4);
    });

    it("should prevent invalid phase transitions", async function () {
      await expect(votingSystem.openPolls()).to.be.revertedWith("Not in registration phase");
      await expect(votingSystem.closePolls()).to.be.revertedWith("Not in voting phase");
    });

    it("should require minimum 2 candidates to open polls", async function () {
      const VotingSystem2 = await ethers.getContractFactory("VotingSystem");
      const vs2 = await VotingSystem2.deploy("Test", "Test");
      await vs2.addCandidate(1, "Solo", "President");
      await vs2.startRegistration();
      await expect(vs2.openPolls()).to.be.revertedWith("Need at least 2 candidates");
    });
  });

  describe("Results", function () {
    it("should return correct results after election ends", async function () {
      await votingSystem.addCandidate(1, "Jane", "President");
      await votingSystem.addCandidate(2, "James", "President");
      await votingSystem.startRegistration();
      await votingSystem.registerVoter(voter1.address);
      await votingSystem.registerVoter(voter2.address);
      await votingSystem.registerVoter(voter3.address);
      await votingSystem.openPolls();

      await votingSystem.connect(voter1).castVote(1);
      await votingSystem.connect(voter2).castVote(1);
      await votingSystem.connect(voter3).castVote(2);

      await votingSystem.closePolls();
      const [ids, names, voteCounts] = await votingSystem.getResults();

      expect(ids.length).to.equal(2);
      expect(names[0]).to.equal("Jane");
      expect(voteCounts[0]).to.equal(2);
      expect(voteCounts[1]).to.equal(1);
    });

    it("should hide results before election ends", async function () {
      await votingSystem.addCandidate(1, "Jane", "President");
      await votingSystem.addCandidate(2, "James", "President");
      await votingSystem.startRegistration();
      await expect(votingSystem.getResults()).to.be.revertedWith("Results not available yet");
    });
  });

  describe("Circuit Breaker", function () {
    it("should allow admin to pause and resume", async function () {
      await votingSystem.addCandidate(1, "Jane", "President");
      await votingSystem.addCandidate(2, "James", "President");
      await votingSystem.startRegistration();
      await votingSystem.registerVoter(voter1.address);
      await votingSystem.openPolls();

      await votingSystem.pauseElection();
      await expect(votingSystem.connect(voter1).castVote(1))
        .to.be.revertedWith("Election is paused");

      await votingSystem.resumeElection();
      await votingSystem.connect(voter1).castVote(1);
      expect(await votingSystem.totalVotes()).to.equal(1);
    });
  });

  describe("Access Control", function () {
    it("should prevent non-admin from phase transitions", async function () {
      await expect(votingSystem.connect(voter1).startRegistration())
        .to.be.revertedWith("Not authorised");
      await expect(votingSystem.connect(voter1).pauseElection())
        .to.be.revertedWith("Not authorised");
    });
  });
});
