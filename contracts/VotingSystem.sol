// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AccessControl
 * @dev Manages role-based permissions for the voting system
 */
contract AccessControl {
    enum Role { None, Voter, ElectoralAdmin, SystemAdmin }
    
    mapping(address => Role) public roles;
    address public owner;
    
    event RoleAssigned(address indexed account, Role role);
    event RoleRevoked(address indexed account);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyRole(Role _role) {
        require(roles[msg.sender] == _role, "Insufficient permissions");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        roles[msg.sender] = Role.SystemAdmin;
    }
    
    function assignRole(address _account, Role _role) external onlyOwner {
        roles[_account] = _role;
        emit RoleAssigned(_account, _role);
    }
    
    function revokeRole(address _account) external onlyOwner {
        roles[_account] = Role.None;
        emit RoleRevoked(_account);
    }
    
    function hasRole(address _account, Role _role) external view returns (bool) {
        return roles[_account] == _role;
    }
}

/**
 * @title VotingSystem
 * @dev Smart contract-based voting system for MMU elections
 * @notice Implements voter registration, vote casting, tallying, and result publication
 */
contract VotingSystem {
    enum Status { NotStarted, Registration, Voting, Ended, ResultsPublished }
    
    Status public electionStatus;
    address public electionAdmin;
    uint256 public totalVotes;
    string public electionTitle;
    string public electionDescription;
    bool public paused;
    
    struct Candidate {
        string name;
        string position;
        uint256 voteCount;
        bool exists;
    }
    
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint256 registeredAt;
    }
    
    mapping(uint256 => Candidate) public candidates;
    mapping(address => Voter) public voters;
    uint256[] public candidateIds;
    uint256 public candidateCount;
    uint256 public registeredVoterCount;
    
    // Events
    event ElectionCreated(string title, uint256 timestamp);
    event VoterRegistered(address indexed voter, uint256 timestamp);
    event VoteCast(uint256 indexed candidateId, uint256 timestamp);
    event PollsOpened(uint256 timestamp);
    event PollsClosed(uint256 timestamp);
    event ResultsPublished(uint256 timestamp);
    event ElectionPaused(uint256 timestamp);
    event ElectionResumed(uint256 timestamp);
    event CandidateAdded(uint256 indexed candidateId, string name, string position);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == electionAdmin, "Not authorised");
        _;
    }
    
    modifier onlyDuringVoting() {
        require(electionStatus == Status.Voting, "Voting not open");
        _;
    }
    
    modifier onlyDuringRegistration() {
        require(electionStatus == Status.Registration, "Not in registration phase");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Election is paused");
        _;
    }
    
    constructor(string memory _title, string memory _description) {
        electionAdmin = msg.sender;
        electionStatus = Status.NotStarted;
        electionTitle = _title;
        electionDescription = _description;
        emit ElectionCreated(_title, block.timestamp);
    }
    
    // Circuit breaker
    function pauseElection() external onlyAdmin {
        paused = true;
        emit ElectionPaused(block.timestamp);
    }
    
    function resumeElection() external onlyAdmin {
        paused = false;
        emit ElectionResumed(block.timestamp);
    }
    
    // Phase transitions
    function startRegistration() external onlyAdmin {
        require(electionStatus == Status.NotStarted, "Election already started");
        electionStatus = Status.Registration;
    }
    
    function addCandidate(uint256 _candidateId, string memory _name, string memory _position) external onlyAdmin {
        require(electionStatus == Status.NotStarted || electionStatus == Status.Registration, "Cannot add candidates now");
        require(!candidates[_candidateId].exists, "Candidate already exists");
        candidates[_candidateId] = Candidate(_name, _position, 0, true);
        candidateIds.push(_candidateId);
        candidateCount++;
        emit CandidateAdded(_candidateId, _name, _position);
    }
    
    function registerVoter(address _voter) external onlyAdmin onlyDuringRegistration whenNotPaused {
        require(!voters[_voter].isRegistered, "Voter already registered");
        voters[_voter] = Voter(true, false, block.timestamp);
        registeredVoterCount++;
        emit VoterRegistered(_voter, block.timestamp);
    }
    
    function registerVotersBatch(address[] memory _voters) external onlyAdmin onlyDuringRegistration whenNotPaused {
        for (uint i = 0; i < _voters.length; i++) {
            if (!voters[_voters[i]].isRegistered) {
                voters[_voters[i]] = Voter(true, false, block.timestamp);
                registeredVoterCount++;
                emit VoterRegistered(_voters[i], block.timestamp);
            }
        }
    }
    
    function openPolls() external onlyAdmin {
        require(electionStatus == Status.Registration, "Not in registration phase");
        require(candidateCount >= 2, "Need at least 2 candidates");
        electionStatus = Status.Voting;
        emit PollsOpened(block.timestamp);
    }
    
    function castVote(uint256 _candidateId) external onlyDuringVoting whenNotPaused {
        Voter storage voter = voters[msg.sender];
        require(voter.isRegistered, "Not a registered voter");
        require(!voter.hasVoted, "Already voted");
        require(candidates[_candidateId].exists, "Candidate does not exist");
        
        // Checks-effects-interactions pattern
        voter.hasVoted = true;
        candidates[_candidateId].voteCount++;
        totalVotes++;
        
        emit VoteCast(_candidateId, block.timestamp);
    }
    
    function closePolls() external onlyAdmin {
        require(electionStatus == Status.Voting, "Not in voting phase");
        electionStatus = Status.Ended;
        emit PollsClosed(block.timestamp);
    }
    
    function publishResults() external onlyAdmin {
        require(electionStatus == Status.Ended, "Election not ended");
        electionStatus = Status.ResultsPublished;
        emit ResultsPublished(block.timestamp);
    }
    
    // View functions
    function getCandidate(uint256 _candidateId) external view returns (string memory name, string memory position, uint256 voteCount) {
        require(candidates[_candidateId].exists, "Candidate not found");
        Candidate memory c = candidates[_candidateId];
        if (electionStatus == Status.Ended || electionStatus == Status.ResultsPublished) {
            return (c.name, c.position, c.voteCount);
        }
        return (c.name, c.position, 0); // Hide votes until election ends
    }
    
    function getAllCandidateIds() external view returns (uint256[] memory) {
        return candidateIds;
    }
    
    function getResults() external view returns (uint256[] memory ids, string[] memory names, uint256[] memory voteCounts) {
        require(electionStatus == Status.Ended || electionStatus == Status.ResultsPublished, "Results not available yet");
        uint256 len = candidateIds.length;
        ids = new uint256[](len);
        names = new string[](len);
        voteCounts = new uint256[](len);
        for (uint i = 0; i < len; i++) {
            ids[i] = candidateIds[i];
            names[i] = candidates[candidateIds[i]].name;
            voteCounts[i] = candidates[candidateIds[i]].voteCount;
        }
        return (ids, names, voteCounts);
    }
    
    function verifyVoterStatus(address _voter) external view returns (bool isRegistered, bool hasVoted) {
        return (voters[_voter].isRegistered, voters[_voter].hasVoted);
    }
    
    function getElectionInfo() external view returns (
        string memory title,
        string memory description,
        Status status,
        uint256 totalCandidates,
        uint256 totalRegisteredVoters,
        uint256 totalVotesCast
    ) {
        return (electionTitle, electionDescription, electionStatus, candidateCount, registeredVoterCount, totalVotes);
    }
}
