// No need for deploy since we're just interacting with already existing contracts
const { ethers, getNamedAccounts } = require("hardhat")
const { getWeth, AMOUNT } = require("./getWeth")

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()
    // abi, address

    // Lending pool address: 0xb53c1a33016b2dc2ff3653530bff1848a515c8c5 https://docs.aave.com/developers/v/2.0/deployed-contracts/deployed-contracts
    const lendingPool = await getLendingPool(deployer)
    console.log(`Lending pool address ${lendingPool.address}`)

    // Need to 1. Approve, 2. Transfer using aave contract
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
    // spender is the lending pool
    console.log("Depositing...")
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0) // refferal code 0 if empty
    console.log("Deposited")
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, deployer)
    // Collateral is laid down, now we need to borrow
    const daiPrice = await getDaiPrice()
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber()) // 0.95 for 95% cap of borrow
    console.log(`You can borrow ${amountDaiToBorrow} DAI`)
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    const daiTokenAddress = "0x6b175474e89094c44da98b954eedeac495271d0f"
    await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer)
    await getBorrowUserData(lendingPool, deployer)
    await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer)
    await getBorrowUserData(lendingPool, deployer)
}

// https://docs.aave.com/developers/v/2.0/the-core-protocol/lendingpool#repay
async function repay(amount, daiAddress, lendingPool, account) {
    await approveErc20(daiAddress, lendingPool.address, amount, account)
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Repaid!")
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrowWei, account) {
    // https://docs.aave.com/developers/v/2.0/the-core-protocol/lendingpool#borrow
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowWei, 1, 0, account)
    await borrowTx.wait(1)
    console.log("Borrow success")
}

async function getDaiPrice() {
    // https://docs.chain.link/docs/ethereum-addresses/#Ethereum%20Mainnet we grab the instantiated pricefeed contract, linkedin with ABI/interface
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
    )
    // Don't need to connect with deployer since it's readonly operation
    const price = (await daiEthPriceFeed.latestRoundData())[1] // It gets all the vars in an array, then selects index [1]
    console.log(`The DAI/ETH price is ${price.toString()}`)
    return price
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        // https://www.youtube.com/watch?v=-vR3a11Wzt0 {destructuring, different, elements} = "gives them", "values", "from the object"
        await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited`)
    console.log(`You have ${totalDebtETH} debt to cover`)
    console.log(`You have ${availableBorrowsETH} avaliable to borrow`)
    return { availableBorrowsETH, totalDebtETH }
}

async function approveErc20(erc20Address, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account) // pulls from IERC20 interface, at address erc20Address
    const tx = await erc20Token.approve(spenderAddress, amountToSpend) // Native function of ERCO20
    await tx.wait(1)
    console.log(`Token ${erc20Address} approved!`)
}

async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xb53c1a33016b2dc2ff3653530bff1848a515c8c5",
        account
    ) // getContractAt is a hardhat extension function of ethers // https://hardhat.org/plugins/nomiclabs-hardhat-ethers
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
    console.log(`${lendingPoolAddress} is the lending pool address`)
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)
    return lendingPool
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
