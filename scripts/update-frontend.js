const fs = require("fs");
const path = require("path");

async function updateFrontend() {
  // Path to the Truffle artifact
  const artifactPath = path.resolve(
    __dirname,
    "../build/contracts/Vesting.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Extract ABI and contract address
  const { abi, networks } = artifact;
  const networkId = Object.keys(networks)[0];
  const contractAddress = networks[networkId].address;

  // Create a config file for the frontend
  const config = {
    contractAddress,
    abi,
  };

  // Write the config to the frontend directory
  const configPath = path.resolve(__dirname, "../src/config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log("Frontend configuration updated successfully!");
}

updateFrontend();
