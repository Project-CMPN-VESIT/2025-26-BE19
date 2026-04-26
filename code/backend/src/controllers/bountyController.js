const {
  createBounty,
  listBounties,
  getBountyById,
  fundBounty,
  closeBounty,
} = require("../services/bountyService");
const { socketHub } = require("../realtime/socketHub");

async function createBountyHandler(req, res) {
  const bounty = await createBounty({
    creatorWallet: req.auth.walletAddress,
    payload: req.body,
  });
  socketHub.broadcast("bounty.created", { bountyId: bounty.id });
  res.status(201).json(bounty);
}

async function listBountiesHandler(req, res) {
  const bounties = await listBounties(req.query);
  res.json(bounties);
}

async function getBountyHandler(req, res) {
  const bounty = await getBountyById(req.params.id);
  res.json(bounty);
}

async function fundBountyHandler(req, res) {
  const bounty = await fundBounty({ id: req.params.id, amountEth: req.body.amountEth });
  socketHub.broadcast("bounty.funded", { bountyId: bounty.id });
  res.json(bounty);
}

async function closeBountyHandler(req, res) {
  const bounty = await closeBounty(req.params.id);
  socketHub.broadcast("bounty.closed", { bountyId: bounty.id });
  res.json(bounty);
}

module.exports = {
  createBountyHandler,
  listBountiesHandler,
  getBountyHandler,
  fundBountyHandler,
  closeBountyHandler,
};
