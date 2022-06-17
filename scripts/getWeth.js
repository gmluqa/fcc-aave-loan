const { getNamedAccounts, ethers } = require("hardhat")

const AMOUNT = ethers.utils.parseEther("0.02")

async function getWeth() {
    const { deployer } = await getNamedAccounts()
    // need abi and contract address to call funcs
    // ABI is the contracts/interfaces/Iweth
    // address of contract made as var in helper config
    const iWeth = await ethers.getContractAt(
        "IWeth",
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
        // "0xc778417E063141139Fce010982780140Aa0cD5Ab", // https://rinkeby.etherscan.io/token/0xc778417e063141139fce010982780140aa0cd5ab
        deployer
        // ABI is found by looking in: contracts/interfaces/IWeth.sol/IWeth.json
        // Then it plasters the ABI on the address
        // From the deployers account
    )
    const tx = await iWeth.deposit({ value: AMOUNT })
    await tx.wait(1) // We wait 1 block conf
    const wethBalance = await iWeth.balanceOf(deployer) // we check our balance
    console.log(`Got ${wethBalance.toString()} WETH`)
}

module.exports = { getWeth }
