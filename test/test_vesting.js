const Vesting = artifacts.require("Vesting");
const ERC20Token = artifacts.require("ERC20Token");

// variable
contract("Vesting", (accounts) => {
  let vestingInstance;
  let tokenInstance;
  const owner = accounts[0];
  const user1 = accounts[1];
  const partner1 = accounts[2];
  const team1 = accounts[3];

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

  // ensuring the contracts are deployed correctly
  it("should deploy the contracts and set up correctly", async () => {
    const tokenBalance = await tokenInstance.balanceOf(vestingInstance.address);
    assert.equal(
      tokenBalance.toNumber(),
      10000,
      "Vesting contract should hold 10000 tokens"
    );
  });

  // ensuring only owner should be able to add beneficiaries
  it("should allow the owner to add a user beneficiary", async () => {
    await vestingInstance.addBeneficiary(
      user1,
      60 * 60 * 24 * 30, // 30 days cliff
      60 * 60 * 24 * 365, // 1 year duration
      0, // Role: User
      { from: owner }
    );
    const beneficiary = await vestingInstance.beneficiaries(user1);
    assert.equal(
      beneficiary.amount.toNumber(),
      5000,
      "User should have 5000 tokens allocated"
    );
  });

  // not allwoing the non-admins/owners to add beneficiareis
  it("should not allow non-owners to add beneficiaries", async () => {
    try {
      await vestingInstance.addBeneficiary(
        user1,
        60 * 60 * 24 * 30, // 30 days cliff
        60 * 60 * 24 * 365, // 1 year duration
        0, // Role: User
        { from: partner1 } // Non-owner attempt
      );
      assert.fail("Non-owner was able to add a beneficiary");
    } catch (error) {
      assert(
        error.message.includes("revert"),
        "Expected revert, got: " + error.message
      );
    }
  });

  // adding the partners and teams
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
      "Partner should have 2500 tokens allocated"
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
      "Team should have 2500 tokens allocated"
    );
  });

  // not releasign the tokens before the clidff period
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

  // allocates the tokens equally to the same role beneficiaries
  it("should finalize token distribution and allocate correctly", async () => {
    // Retrieve the beneficiaries' details again after adding if necessary
    const beneficiary1 = await vestingInstance.beneficiaries(user1);
    const beneficiary2 = await vestingInstance.beneficiaries(partner1);
    const beneficiary3 = await vestingInstance.beneficiaries(team1);

    // Log the allocated amounts for debugging
    console.log("User allocated tokens:", beneficiary1.amount.toNumber());
    console.log("Partner allocated tokens:", beneficiary2.amount.toNumber());
    console.log("Team allocated tokens:", beneficiary3.amount.toNumber());

    // Check the total allocated amount
    assert.equal(
      beneficiary1.amount.toNumber() +
        beneficiary2.amount.toNumber() +
        beneficiary3.amount.toNumber(),
      10000,
      "Total allocation for User and Partner should be 10000 tokens"
    );
  });
});
