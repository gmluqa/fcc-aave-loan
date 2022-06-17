// No need for deploy since we're just interacting with already existing contracts
const { getWeth } = require("./getWeth")

async function main() {
    await getWeth()
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
