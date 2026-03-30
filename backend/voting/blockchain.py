"""
Blockchain service layer for MMU Voting System
Handles all Web3.py interactions with the Ethereum smart contract
"""
import json
import os
from django.conf import settings

# Smart contract ABI (Application Binary Interface)
CONTRACT_ABI = [
    {
        "inputs": [{"internalType": "string", "name": "_title", "type": "string"}, {"internalType": "string", "name": "_description", "type": "string"}],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {"inputs": [], "name": "electionStatus", "outputs": [{"internalType": "enum VotingSystem.Status", "name": "", "type": "uint8"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "electionAdmin", "outputs": [{"internalType": "address", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "totalVotes", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "candidateCount", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "registeredVoterCount", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {
        "inputs": [],
        "name": "startRegistration",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "_candidateId", "type": "uint256"}, {"internalType": "string", "name": "_name", "type": "string"}, {"internalType": "string", "name": "_position", "type": "string"}],
        "name": "addCandidate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "_voter", "type": "address"}],
        "name": "registerVoter",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address[]", "name": "_voters", "type": "address[]"}],
        "name": "registerVotersBatch",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "openPolls",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "_candidateId", "type": "uint256"}],
        "name": "castVote",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "closePolls",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "publishResults",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "pauseElection",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "resumeElection",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "_candidateId", "type": "uint256"}],
        "name": "getCandidate",
        "outputs": [
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "string", "name": "position", "type": "string"},
            {"internalType": "uint256", "name": "voteCount", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getAllCandidateIds",
        "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getResults",
        "outputs": [
            {"internalType": "uint256[]", "name": "ids", "type": "uint256[]"},
            {"internalType": "string[]", "name": "names", "type": "string[]"},
            {"internalType": "uint256[]", "name": "voteCounts", "type": "uint256[]"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "_voter", "type": "address"}],
        "name": "verifyVoterStatus",
        "outputs": [
            {"internalType": "bool", "name": "isRegistered", "type": "bool"},
            {"internalType": "bool", "name": "hasVoted", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getElectionInfo",
        "outputs": [
            {"internalType": "string", "name": "title", "type": "string"},
            {"internalType": "string", "name": "description", "type": "string"},
            {"internalType": "enum VotingSystem.Status", "name": "status", "type": "uint8"},
            {"internalType": "uint256", "name": "totalCandidates", "type": "uint256"},
            {"internalType": "uint256", "name": "totalRegisteredVoters", "type": "uint256"},
            {"internalType": "uint256", "name": "totalVotesCast", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [{"indexed": True, "internalType": "uint256", "name": "candidateId", "type": "uint256"}, {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"}],
        "name": "VoteCast",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [{"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"}],
        "name": "PollsOpened",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [{"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"}],
        "name": "PollsClosed",
        "type": "event"
    },
]


class BlockchainService:
    """Service for interacting with the VotingSystem smart contract via Web3.py"""

    def __init__(self):
        self._w3 = None
        self._contract = None

    @property
    def w3(self):
        if self._w3 is None:
            from web3 import Web3
            provider_url = settings.BLOCKCHAIN_PROVIDER
            self._w3 = Web3(Web3.HTTPProvider(provider_url))
        return self._w3

    @property
    def is_connected(self):
        try:
            return self.w3.is_connected()
        except Exception:
            return False

    def get_contract(self, address):
        return self.w3.eth.contract(
            address=self.w3.to_checksum_address(address),
            abi=CONTRACT_ABI
        )

    def get_admin_account(self):
        private_key = settings.ADMIN_PRIVATE_KEY
        if private_key:
            account = self.w3.eth.account.from_key(private_key)
            return account
        # Fallback: use first account from node (Ganache)
        accounts = self.w3.eth.accounts
        if accounts:
            return type('Account', (), {'address': accounts[0], 'key': None})()
        raise Exception("No admin account configured")

    def deploy_contract(self, title, description, bytecode=None):
        """Deploy a new VotingSystem contract"""
        admin = self.get_admin_account()

        if bytecode is None:
            # Use pre-compiled bytecode (would normally come from Hardhat compilation)
            raise Exception("Contract bytecode required for deployment. Use Hardhat to compile.")

        contract = self.w3.eth.contract(abi=CONTRACT_ABI, bytecode=bytecode)
        tx = contract.constructor(title, description).build_transaction({
            'from': admin.address,
            'nonce': self.w3.eth.get_transaction_count(admin.address),
            'gas': 3000000,
            'gasPrice': self.w3.to_wei('20', 'gwei'),
        })

        if admin.key:
            signed = self.w3.eth.account.sign_transaction(tx, admin.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        else:
            tx_hash = self.w3.eth.send_transaction(tx)

        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return receipt.contractAddress, receipt.transactionHash.hex()

    def _send_admin_tx(self, contract_address, func_name, *args):
        """Helper to send an admin transaction"""
        admin = self.get_admin_account()
        contract = self.get_contract(contract_address)
        func = getattr(contract.functions, func_name)(*args)

        tx = func.build_transaction({
            'from': admin.address,
            'nonce': self.w3.eth.get_transaction_count(admin.address),
            'gas': 500000,
            'gasPrice': self.w3.to_wei('20', 'gwei'),
        })

        if admin.key:
            signed = self.w3.eth.account.sign_transaction(tx, admin.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        else:
            tx_hash = self.w3.eth.send_transaction(tx)

        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return receipt

    def start_registration(self, contract_address):
        return self._send_admin_tx(contract_address, 'startRegistration')

    def add_candidate(self, contract_address, candidate_id, name, position):
        return self._send_admin_tx(contract_address, 'addCandidate', candidate_id, name, position)

    def register_voter(self, contract_address, voter_address):
        return self._send_admin_tx(contract_address, 'registerVoter', self.w3.to_checksum_address(voter_address))

    def register_voters_batch(self, contract_address, voter_addresses):
        addresses = [self.w3.to_checksum_address(a) for a in voter_addresses]
        return self._send_admin_tx(contract_address, 'registerVotersBatch', addresses)

    def open_polls(self, contract_address):
        return self._send_admin_tx(contract_address, 'openPolls')

    def cast_vote(self, contract_address, voter_private_key, candidate_id):
        """Cast a vote from a voter's wallet"""
        account = self.w3.eth.account.from_key(voter_private_key)
        contract = self.get_contract(contract_address)

        tx = contract.functions.castVote(candidate_id).build_transaction({
            'from': account.address,
            'nonce': self.w3.eth.get_transaction_count(account.address),
            'gas': 200000,
            'gasPrice': self.w3.to_wei('20', 'gwei'),
        })

        signed = self.w3.eth.account.sign_transaction(tx, voter_private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return receipt

    def cast_vote_from_backend(self, contract_address, candidate_id, voter_address):
        """
        Cast a vote on behalf of a voter (backend-managed wallets).
        In production, voters would sign transactions themselves via MetaMask.
        For the prototype, the backend manages wallets.
        """
        return self._send_admin_tx(contract_address, 'castVote', candidate_id)

    def close_polls(self, contract_address):
        return self._send_admin_tx(contract_address, 'closePolls')

    def publish_results(self, contract_address):
        return self._send_admin_tx(contract_address, 'publishResults')

    def pause_election(self, contract_address):
        return self._send_admin_tx(contract_address, 'pauseElection')

    def resume_election(self, contract_address):
        return self._send_admin_tx(contract_address, 'resumeElection')

    # View functions
    def get_election_info(self, contract_address):
        contract = self.get_contract(contract_address)
        result = contract.functions.getElectionInfo().call()
        status_map = {0: 'not_started', 1: 'registration', 2: 'voting', 3: 'ended', 4: 'results_published'}
        return {
            'title': result[0],
            'description': result[1],
            'status': status_map.get(result[2], 'unknown'),
            'total_candidates': result[3],
            'total_registered_voters': result[4],
            'total_votes_cast': result[5],
        }

    def get_results(self, contract_address):
        contract = self.get_contract(contract_address)
        ids, names, vote_counts = contract.functions.getResults().call()
        return [
            {'candidate_id': ids[i], 'name': names[i], 'vote_count': vote_counts[i]}
            for i in range(len(ids))
        ]

    def verify_voter_status(self, contract_address, voter_address):
        contract = self.get_contract(contract_address)
        is_registered, has_voted = contract.functions.verifyVoterStatus(
            self.w3.to_checksum_address(voter_address)
        ).call()
        return {'is_registered': is_registered, 'has_voted': has_voted}

    def verify_transaction(self, tx_hash):
        """Verify a transaction exists on the blockchain"""
        try:
            tx = self.w3.eth.get_transaction(tx_hash)
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            return {
                'exists': True,
                'block_number': receipt.blockNumber,
                'status': 'success' if receipt.status == 1 else 'failed',
                'from': tx['from'],
                'to': tx['to'],
                'gas_used': receipt.gasUsed,
            }
        except Exception:
            return {'exists': False}


# Singleton instance
blockchain_service = BlockchainService()
