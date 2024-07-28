const Vesting = artifacts.require("Vesting");
const ERC20Token = artifacts.require("ERC20Token");

// variable
contract("Vesting", (accounts) => {
  let vestingInstance;
  let tokenInstance;
  const owner = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const partner1 = accounts[3];
  const team1 = accounts[4];

  // before hook for setting up th environement
  before(async () => {
    // deploying a new erc20 token contract with an initial 10000 tokens
    tokenInstance = await ERC20Token.new(10000, { from: owner });

    // deploying the contract passing the address of token
    vestingInstance = await Vesting.new(tokenInstance.address, { from: owner });

    // transfering tokens from owner to vesting contract
    await tokenInstance.transfer(vestingInstance.address, 10000, {
      from: owner,
    });
  });

  // 
  it("should deploy the contracts and set up correctly", async () => {
    const tokenBalance = await tokenInstance.balanceOf(vestingInstance.address);
    assert.equal(
      tokenBalance.toNumber(),
      10000,
      "Vesting contract should hold 10000 tokens"
    );
  });

  it("should allow the owner to add a user beneficiary", async () => {
    await vestingInstance.addBeneficiary(
      user1,
      0,
      60 * 60 * 24 * 30,
      60 * 60 * 24 * 365,
      0,
      { from: owner }
    );
    const beneficiary = await vestingInstance.beneficiaries(user1);
    assert.equal(
      beneficiary.amount.toNumber(),
      5000,
      "User should have 5000 tokens allocated"
    );
  });

  it("should not allow non-owners to add beneficiaries", async () => {
    try {
      await vestingInstance.addBeneficiary(
        user2,
        0,
        60 * 60 * 24 * 30,
        60 * 60 * 24 * 365,
        0,
        { from: user1 }
      );
      assert.fail("Non-owner was able to add a beneficiary");
    } catch (error) {
      assert(
        error.message.includes("revert"),
        "Expected revert, got: " + error.message
      );
    }
  });

  it("should add partner and team beneficiaries correctly", async () => {
    await vestingInstance.addBeneficiary(
      partner1,
      0,
      60 * 60 * 24 * 30,
      60 * 60 * 24 * 365,
      1,
      { from: owner }
    );
    const partner = await vestingInstance.beneficiaries(partner1);
    assert.equal(
      partner.amount.toNumber(),
      2500,
      "Partner should have 2500 tokens allocated"
    );

    await vestingInstance.addBeneficiary(
      team1,
      0,
      60 * 60 * 24 * 30,
      60 * 60 * 24 * 365,
      2,
      { from: owner }
    );
    const team = await vestingInstance.beneficiaries(team1);
    assert.equal(
      team.amount.toNumber(),
      2500,
      "Team should have 2500 tokens allocated"
    );
  });

  it("should not release tokens before the cliff period", async () => {
    try {
      await vestingInstance.releaseTokens({ from: user1 });
      assert.fail("Tokens were released before the cliff period");
    } catch (error) {
      assert(
        error.message.includes("revert"),
        "Expected revert, got: " + error.message
      );
    }
  });
});
