import {DSTest} from "ds-test/test.sol";
import {Dapptutorial} from "../Dapptutorial.sol";

contract DapptutorialTest is DSTest {
    Dapptutorial dapptutorial;

    function setUp() public {
        dapptutorial = new Dapptutorial();
    }

    function test_withdraw(uint96 amount) public {
        payable(address(dapptutorial)).transfer(amount);
        
        uint preBalance = address(this).balance;

        dapptutorial.withdraw(42);

        uint postBalance = address(this).balance;

        assertEq(preBalance + amount, postBalance);
    }

    function testFail_withdraw_wrong_pass() public {
        payable(address(dapptutorial)).transfer(1 ether);

        uint preBalance = address(this).balance;

        dapptutorial.withdraw(1);

        uint postBalance = address(this).balance;

        assertEq(preBalance + 1 ether, postBalance);
    }

    // Not working in 0.49.0 version of dapptools https://github.com/dapphub/dapptools/issues/934
    // function proveFail_withdraw(uint guess) public {
    //     payable(address(dapptutorial)).transfer(1 ether);

    //     uint preBalance = address(this).balance;

    //     dapptutorial.withdraw(guess);

    //     uint postBalance = address(this).balance;
        
    //     assertEq(preBalance + 1 ether, postBalance);
    // }

    // allow sending eth to the test contract
    receive() external payable {}
}