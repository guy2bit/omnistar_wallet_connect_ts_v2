//import {randomUUID} from "crypto";
//import crypto from "crypto";
export async function CreateDepositJson(
    contract_params:any,
    timeout:number,
    link:{object_id:string, safe_id:string}
): Promise<any> {
    let result = {
        "id": crypto.randomUUID(),
        "class": "deposit",
        "parentGroup": "Primary",
        "flavor": "trade_layer2",
        "deposit": "",
        "contract": [
            {
                "class": "condition.requested-price",
                "params": contract_params
            }
        ],
        "timeout": String(timeout),
        "network_fees": [{
            "asset": "ETH",
            "network_fee": "1"
        }],
        "link": {
            "id": link.object_id,
            "safe_id": link.safe_id,
            "link_data": "transfer",
            "link_parameter": "deposit"
        }
    }
    return result;
}