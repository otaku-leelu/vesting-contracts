const Vesting = artifacts.require("Vesting");
const ERC20Token = artifacts.require("ERC20Token");
const { time } = require("@openzeppelin/test-helpers");

// variables
contract("Vesting", (accounts) => {
  let vestingInstance;
  let tokenInstance;
  const owner = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const partner1 = accounts[3];
  const team1 = accounts[4];

  // before hook for setting up the environment
  before(async () => {
    // deploying a new erc20 token contract with an initial 10000 tokens
    tokenInstance = await ERC20Token.new(10000, { from: owner });

    // deploying the contract passing the address of token
    vestingInstance = await Vesting.new(tokenInstance.address, { from: owner });

    // transferring tokens from owner to vesting contract
    await tokenInstance.transfer(vestingInstance.address, 10000, {
      from: owner,
    });
  });

  // ensuring the contracts are deployed correctly
  it("should deploy the contracts and set up correctly", async () => {
    const tokenBalance = await tokenInstance.balanceOf(vestingInstance.address);
    assert.equal(
      tokenBalance.toNumber(),
      10000,
      "vesting contract should hold 10000 tokens"
    );
  });

  // ensuring only owner should be able to add beneficiaries
  it("should allow the owner to add a user beneficiary", async () => {
    await vestingInstance.addBeneficiary(
      user1,
      60 * 60 * 24 * 30, // 30 days cliff
      60 * 60 * 24 * 730, // 2 years duration
      0, // Role: User
      { from: owner }
    );
    const beneficiary = await vestingInstance.beneficiaries(user1);
    assert.equal(
      beneficiary.amount.toNumber(),
      5000,
      "user should have 5000 tokens allocated"
    );
  });

  // not allowing the non-admins/owners to add beneficiaries
  it("should not allow non-owners to add beneficiaries", async () => {
    try {
      await vestingInstance.addBeneficiary(
        user2,
        60 * 60 * 24 * 30, // 30 days cliff
        60 * 60 * 24 * 730, // 2 years duration
        0, // Role: User
        { from: partner1 } // non-owner attempt
      );
      assert.fail("non-owner was able to add a beneficiary");
    } catch (error) {
      assert(
        error.message.includes("revert"),
        "expected revert, got: " + error.message
      );
    }
  });

  // adding multiple beneficiaries and different roles
  it("should add partner and team beneficiaries correctly", async () => {
    await vestingInstance.addBeneficiary(
      partner1,
      60 * 60 * 24 * 30, // 30 days cliff
      60 * 60 * 24 * 365, // 1 year duration
      1, // Role: Partner
      { from: owner }
    );
    const partner = await vestingInstance.beneficiaries(partner1);
    assert.equal(
      partner.amount.toNumber(),
      2500,
      "partner should have 2500 tokens allocated"
    );

    await vestingInstance.addBeneficiary(
      team1,
      60 * 60 * 24 * 30, // 30 days cliff
      60 * 60 * 24 * 365, // 1 year duration
      2, // Role: Team
      { from: owner }
    );
    const team = await vestingInstance.beneficiaries(team1);
    assert.equal(
      team.amount.toNumber(),
      2500,
      "team should have 2500 tokens allocated"
    );
  });

  // not releasing the tokens before the cliff period
  it("should not release tokens before the cliff period", async () => {
    try {
      await vestingInstance.releaseTokens({ from: user1 });
      assert.fail("tokens were released before the cliff period");
    } catch (error) {
      assert(
        error.message.includes("revert"),
        "expected revert, got: " + error.message
      );
    }
  });

  // releasing tokens after the cliff period
  it("should release tokens after the cliff period", async () => {
    await time.increase(60 * 60 * 24 * 31); // increasing time by 31 days to pass the cliff period
    const userBalanceBefore = await tokenInstance.balanceOf(user1);
    await vestingInstance.releaseTokens({ from: user1 });
    const userBalanceAfter = await tokenInstance.balanceOf(user1);

    assert(userBalanceAfter.gt(userBalanceBefore), "tokens were not released");
  });

  // checking no further release immediately after
  it("should not allow immediate further release after first release", async () => {
    try {
      await vestingInstance.releaseTokens({ from: user1 });
      assert.fail(
        "tokens were released again immediately after the first release"
      );
    } catch (error) {
      assert(
        error.message.includes("revert"),
        "expected revert, got: " + error.message
      );
    }
  });

  // releasing tokens partially after more time passes
  it("should release tokens partially after more time passes", async () => {
    await time.increase(60 * 60 * 24 * 180); // increasing time by another 6 months
    const userBalanceBefore = await tokenInstance.balanceOf(user1);
    await vestingInstance.releaseTokens({ from: user1 });
    const userBalanceAfter = await tokenInstance.balanceOf(user1);

    assert(
      userBalanceAfter.gt(userBalanceBefore),
      "tokens were not released partially after more time passed"
    );
  });

  // releasing all tokens after full vesting period
  it("should release all tokens after the full vesting period", async () => {
    const cliff = 60 * 60 * 24 * 30; // 30 days cliff
    const duration = 60 * 60 * 24 * 730; // 2 years duration
    await time.increase(cliff + duration); // fast forward to end of vesting period
    const userBalanceBefore = await tokenInstance.balanceOf(user1);
    await vestingInstance.releaseTokens({ from: user1 });
    const userBalanceAfter = await tokenInstance.balanceOf(user1);

    assert.equal(
      userBalanceAfter.toNumber(),
      5000,
      "all tokens should be released after the full vesting period"
    );
  });

  // verifying final token distribution
  it("should finalize token distribution and allocate correctly", async () => {
    const beneficiary1 = await vestingInstance.beneficiaries(user1);
    const beneficiary2 = await vestingInstance.beneficiaries(partner1);
    const beneficiary3 = await vestingInstance.beneficiaries(team1);

    console.log("user allocated tokens:", beneficiary1.amount.toNumber());
    console.log("partner allocated tokens:", beneficiary2.amount.toNumber());
    console.log("team allocated tokens:", beneficiary3.amount.toNumber());

    assert.equal(
      beneficiary1.amount.toNumber() +
        beneficiary2.amount.toNumber() +
        beneficiary3.amount.toNumber(),
      10000,
      "total allocation for user, partner, and team should be 10000 tokens"
    );
  });
});
