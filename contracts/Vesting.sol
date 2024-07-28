// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// importing necessary libarries from openzeppelin
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract Vesting is Ownable {
    IERC20 public token;
    
    //initialized sturct called schedule for the beneficiary
    struct Schedule {
        uint256 cliff;
        uint256 start;
        uint256 duration;
        uint256 amount;
        uint256 released;
    }

    //mapping to store and check the beneficiaries
    mapping (address => Schedule) public beneficiaries;
    mapping (address => bool) public addBeneficiaries;

    event BeneficiaryAdded(address indexed beneficiary, uint256 amount);
    event TokensReleased(address indexed beneficiary, uint256 amount);
    event VestingStarted();

    constructor(IERC20 _token) Ownable(msg.sender) {
        token = _token;
    }

    // adding new beneficicary
    function addBeneficiary(address _beneficiary, uint256 _amount, uint256 _cliff, uint256 _duration) external onlyOwner () {
        // check if they exisit or not
        require(!addBeneficiaries[_beneficiary], "beneficiary already added");
        beneficiaries[_beneficiary] = Schedule({
            cliff: block.timestamp + _cliff, // cliff period start
            start: block.timestamp, // vesting start time
            duration: _duration, // duration
            amount: _amount, // amount allocated
            released: 0 // amount/tokens released (set to zero because new members have empty balances)
        });
        addBeneficiaries[_beneficiary] = true; //marking the beneficiary
        emit BeneficiaryAdded(_beneficiary, _amount);
    }

    // function to calculate the amount relealse
    function _vestedAmount(Schedule memory schedule) internal view returns (uint256) {
        if (block.timestamp < schedule.cliff) {
            return 0;
        }
        else if (block.timestamp >= schedule.start + schedule.duration){
            return schedule.amount - schedule.released;
        }
        else{
            return(schedule.amount * (block.timestamp - schedule.start)) / schedule.duration - schedule.released;
        }
    }

    //function to release the amount
    function releaseTokens() external {
        Schedule storage schedule = beneficiaries[msg.sender];
        require(block.timestamp >= schedule.cliff, "cliff period not reached!");
        uint256 vested = _vestedAmount(schedule);
        require(vested > 0, "no vested tokens available");

        schedule.released = schedule.released + vested;
        require(token.transfer(msg.sender, vested), "token transfer failed");

        emit TokensReleased(msg.sender, vested);
    }
}
