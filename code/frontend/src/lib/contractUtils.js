import { ethers } from 'ethers';
import artifact from './BountyEscrow.json';

export const BOUNTY_ESCROW_ABI = artifact.abi;
export const BOUNTY_ESCROW_BYTECODE = artifact.bytecode;

function getContract(signer, contractAddress) {
  return new ethers.Contract(contractAddress, BOUNTY_ESCROW_ABI, signer);
}

export const deployBountyEscrow = async (signer, metadataUri, initialDepositEth) => {
  const signerAddress = await signer.getAddress();
  const factory = new ethers.ContractFactory(BOUNTY_ESCROW_ABI, BOUNTY_ESCROW_BYTECODE, signer);
  const contract = await factory.deploy(signerAddress, {
    gasLimit: 4500000,
  });
  await contract.waitForDeployment();

  const initTx = await contract.createBounty(
    signerAddress,
    metadataUri,
    ethers.ZeroAddress,
    BigInt(2 * 24 * 60 * 60),
    BigInt(3 * 24 * 60 * 60),
    {
      value: ethers.parseEther(initialDepositEth.toString()),
      gasLimit: 1500000,
    },
  );
  await initTx.wait();

  return await contract.getAddress();
};

export const payoutResearcher = async (signer, contractAddress, researcherAddress, amountEth) => {
  const contract = getContract(signer, contractAddress);
  const tx = await contract.approveAndPay(researcherAddress, ethers.parseEther(amountEth.toString()), {
    gasLimit: 500000,
  });
  return await tx.wait();
};

export const depositToEscrow = async (signer, contractAddress, amountEth) => {
  const contract = getContract(signer, contractAddress);
  const tx = await contract.deposit({
    value: ethers.parseEther(amountEth.toString()),
    gasLimit: 300000,
  });
  return await tx.wait();
};

export const closeEscrow = async (signer, contractAddress) => {
  const contract = getContract(signer, contractAddress);
  const tx = await contract.closeBounty({
    gasLimit: 500000,
  });
  return await tx.wait();
};

export const submitReportHash = async (signer, contractAddress, reportHash) => {
  const contract = getContract(signer, contractAddress);
  const signerAddress = await signer.getAddress();
  const tx = await contract.submitReportHash(signerAddress, reportHash, {
    gasLimit: 350000,
  });
  return await tx.wait();
};
