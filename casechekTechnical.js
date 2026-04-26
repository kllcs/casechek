/*
Kasidy Landry
Casechek interview technical challenge
April 2026

Takes HL7 SIU message from txt file in directory
returns JSON output according to rules provided
*/

const fs = require("fs");
const implantsArray = [];

var obj = {
    scheduling: "", 
    caseId: "", 
    hospitalId: "", 
    surgeryLocation: "", 
    operatingRoom: "", 
    surgeonId: "", 
    surgeonGivenName: "", 
    surgeonFamilyName: "", 
    surgerySides: "", 
    surgeryDateTime: "", 
    procedureType: "", 
    procedureDescription: "", 
    implants: [], 
    meta: {}
};

var meta = {
        totalImplants: 0, 
        unrecognizedNteCount: 0
};

//test output
/*
fs.writeFile('C:/Users/kasid/Desktop/casechek/results/results.json', HL7ToJSON(), err => {
        if (err) {
            console.error(err);
        } else {
            // file written successfully
            console.log(HL7ToJSON());
        }
});*/

function HL7ToJSON(){

    //read file's contents
    fs.readFile("HL7-1.txt", (err, HL7) => {
        if (err) {
            console.error(err);
            return;
        }
        
        //get data from file as a string
        var HL7data = HL7.toString();

        //split the HL7 data into segments
        var HL7dataSegments = HL7data.split("\n");

        //keep track of segments that are NTE segments and which of those are implants
        var unrecognizedNteCount = 0;
        var totalImplants = 0;

        //loop thorugh all segments and grab all needed info from each segment
        for(j = 0; j < HL7dataSegments.length; j++){
            //get Scheduling Status Code and Case Id from SCH segment
            if(HL7dataSegments[j].substring(0, 3) == "SCH"){
                //split SCH segment by pipes | to get fields
                var SCHdata = HL7dataSegments[j].split("|");

                //split SCH-25 field by carets ^ to get components
                var SCH_25 = SCHdata[25].split("^"); 

                //scheduling status code: SCH-25-2
                obj.scheduling = SCH_25[1];

                //Case ID: SCH-2
                obj.caseId = SCHdata[2];
            }

            //get hospitalID from MSH segment
            if(HL7dataSegments[j].substring(0, 3) == "MSH"){
                //split MSH segment by pipes | to get fields
                var MSHdata = HL7dataSegments[j].split("|");

                //Hospital ID: MSH-4
                obj.hospitalId = MSHdata[3];
            }

            //get Surgery Location and Operating Room from AIL segment
            if(HL7dataSegments[j].substring(0, 3) == "AIL"){
                //split AIL segment by pipes | to get fields
                var AILdata = HL7dataSegments[j].split("|");

                //split AIL-3 by carets ^ to get components
                var AIL_3 = AILdata[3].split("^"); 

                //Surgery Location: AIL-3-4
                obj.surgeryLocation = AIL_3[3];

                //Operating Room: AIL-3-2
                obj.operatingRoom = AIL_3[1];
            }

            //get SurgeonID and Surgeon's Names from AIP segment
            if(HL7dataSegments[j].substring(0, 3) == "AIP"){
                //split AIP segment by pipes | to get fields
                var AIPdata = HL7dataSegments[j].split("|");

                if(AIPdata[1] == 1){
                    //split AIP-3 by carets ^ to get components
                    var AIP_3 = AIPdata[3].split("^");

                    //Surgeon ID: AIP-3-1
                    obj.surgeonId = AIP_3[0];

                    ///Surgeon Given Name: AIP-3-3
                    obj.surgeonGivenName = AIP_3[2];

                    //Surgeon Family Name: AIP-3-2
                    obj.surgeonFamilyName = AIP_3[1];
                }
            }

            //get Surgery Sides, Surgery Date/Time, and Procedure Type from AIS segment
            if(HL7dataSegments[j].substring(0, 3) == "AIS"){
                //split AIS segment by pipes | to get fields
                var AISdata = HL7dataSegments[j].split("|");

                //split AIS-12 and AIS-3 by carets ^ to get components
                var AIS_12 = AISdata[12].split("^");
                var AIS_3 = AISdata[3].split("^");

                //Surgery Sides: AIS-12-2
                obj.surgerySides = AIS_12[1];

                //Surgery Date/Time: AIS-4
                obj.surgeryDateTime = AISdata[4];
                
                //Procedure Type: AIS-3-2
                obj.procedureType = AIS_3[1];
            }

            //get Procedure Description and Implants from NTE segments
            if(HL7dataSegments[j].substring(0, 3) == "NTE"){
                //create implant object to store each implant's info
                var implant = {
                    description: "", 
                    quantity: 0, 
                    lotNumber: "", 
                    requiresReview: false,
                    parseError: false};

                //split NTE segment by pipes | to get fields
                var NTEdata = HL7dataSegments[j].split("|");

                //only use IMPLANT NTE segments
                if(NTEdata[3].substring(0,7) == "IMPLANT"){
                    //+1 total implants
                    meta.totalImplants = meta.totalImplants + 1;

                    //strip "IMPLANT: " from string
                    var NTE_3 = NTEdata[3].substring(9);

                    //split implant info 
                    NTE_3Split = NTE_3.split(" - ");

                    //check for all 3 types of data we need
                    if(NTE_3Split.length < 3){
                        implant.parseError = true;
                    }

                    //loop through the data in NTE-3 that was split by " - " to get implant information
                    for(var k = 0; k < NTE_3Split.length; k++){
                        //implant quantity
                        if(NTE_3Split[k].substring(0,5) == "Qty: " && NTE_3Split[k].length > 5){
                            implant.quantity = NTE_3Split[k].substring(5);

                            //check to make sure it is interger not string
                            if(Number.isInteger(Number(implant.quantity))){
                            }else{
                                implant.parseError = true;
                            }

                            //if qty is greater than 2, then it requires review
                            if(Number(implant.quantity) > 2){
                                implant.requiresReview = true;
                            }
                            else{
                                implant.requiresReview = false;
                            }
                        }

                        //implant lot
                        else if(NTE_3Split[k].substring(0,5) == "LOT: " && NTE_3Split[k].length > 5){
                            implant.lotNumber = NTE_3Split[k].substring(5);
                        }

                        //implant description
                        else if(NTE_3Split[k] != "null" || NTE_3Split[k] != ""){
                            implant.description = NTE_3Split[k];
                        }

                        //unidentified implant info
                        else{
                            parseError = true;
                        }
                    }

                    //add implant object to array of all implants
                    implantsArray[Number(meta.totalImplants) - 1] = implant;
                }

                //procedure description
                else if(NTEdata[4] == "Procedure Description"){
                    obj.procedureDescription = NTEdata[3];
                }

                //unrecognized NTE segment
                else{
                    //unrecognizedNteCount++;
                    meta.unrecognizedNteCount = meta.unrecognizedNteCount + 1;
                }                        
            }
        }
    });

    //add array of implants to object
    obj.implants = implantsArray;
    
    //add meta object to obj
    obj.meta = meta;

    jsonObj = JSON.stringify(obj);
    return jsonObj;
}


