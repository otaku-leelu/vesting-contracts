let web3;
let vestingInstance;
let account;

async function connectWallet() {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
      await window.ethereum.enable();
      account = (await web3.eth.getAccounts())[0];
      document.getElementById("account").innerText = account;
      document.getElementById("accountInfo").style.display = "block";
      document.getElementById("adminControls").style.display = "block";
      loadBlockchainData();
    } catch (error) {
      console.error("User denied account access...");
    }
  } else {
    alert(
      "Non-Ethereum browser detected. You should consider trying MetaMask!"
    );
  }
}

async function loadBlockchainData() {
  const networkId = await web3.eth.net.getId();
  const config = await fetch("config.json").then((response) => response.json());
  const vestingData = config.Vesting;
  const networkData = vestingData.networks[networkId];
  if (networkData) {
    vestingInstance = new web3.eth.Contract(
      vestingData.abi,
      networkData.address
    );
  } else {
    alert("Smart contract not deployed to detected network.");
  }
}

async function addBeneficiary() {
  const beneficiaryAddress =
    document.getElementById("beneficiaryAddress").value;
  const role = document.getElementById("role").value;
  const cliff = convertTimeToSeconds(
    document.getElementById("cliff").value,
    document.getElementById("cliffUnit").value
  );
  const duration = convertTimeToSeconds(
    document.getElementById("duration").value,
    document.getElementById("durationUnit").value
  );
  const tokens = web3.utils.toWei(
    document.getElementById("tokens").value,
    "ether"
  );

  if (vestingInstance && account) {
    try {
      await vestingInstance.methods
        .addBeneficiary(beneficiaryAddress, cliff, duration, role, tokens)
        .send({ from: account });
      alert("Beneficiary added successfully!");
    } catch (error) {
      console.error("Error adding beneficiary:", error);
      alert("There was an error adding the beneficiary.");
    }
  }
}

function convertTimeToSeconds(value, unit) {
  const timeUnits = {
    minutes: 60,
    hours: 3600,
    days: 86400,
    months: 2592000, 
    years: 31536000,
  };
  return value * timeUnits[unit];
}

document
  .getElementById("connectButton")
  .addEventListener("click", connectWallet);
document
  .getElementById("addBeneficiaryButton")
  .addEventListener("click", addBeneficiary);
