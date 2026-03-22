const express = require("express");
const jwt = require("jsonwebtoken");
const { authMiddleware } = require("./middleware")

let USERS_ID = 1;
let ORGANIZATION_ID = 1;
let BOARD_ID = 1;
let ISSUES_ID = 1;

const USERS = [];

const ORGANIZATIONS = [];

const BOARDS = [];

const ISSUES = [];

const app = express();
app.use(express.json());

// CREATE
app.post("/signup", (req, res) => {
    console.log(req.body);
    const username = req.body.username;
    const password = req.body.password;
    
    const userExists = USERS.find(u => u.username === username);
    if (userExists) {
        return res.status(411).json({
            message: "User with this username already exists"
        });
        
    }

    USERS.push({
        username,
        password,
        id: USERS_ID++
    })

    return res.json({
        message: "You have signed up successfully"
    })

})

app.post("/signin", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const userExists = USERS.find(u => u.username === username && u.password === password);
    if (!userExists) {
        res.status(403).json({
            message: "Incorrect credentials"
        })
    }

    const token = jwt.sign({
        userId: userExists.id
    }, "attlasiationsupersecret123123password");
    // create a jwt for the user

    res.json({
        token
    })
})

// AUTHENTICATED ROUTE - MIDDLEWARE
app.post("/organization", authMiddleware, (req, res) => {
    const userId = req.userId;
    ORGANIZATIONS.push({
        id: ORGANIZATION_ID++,
        title: req.body.title,
        description: req.body.description,
        admin: userId,
        members: []
    })

    res.json({
        message: "Org created",
        id: ORGANIZATION_ID - 1
    })
})

app.post("/add-member-to-organization", authMiddleware, (req, res) => {
    const userId = req.userId;
    const organizationId = req.body.organizationId;
    const memerUserUsername = req.body.memerUserUsername;

    const organization = ORGANIZATIONS.find(org => org.id === organizationId);

    if (!organization || organization.admin !== userId) {
        res.status(411).json({
            message: "Either this org doesnt exist or you are not an admin of this org"
        })
        return
    }

    const memberUser = USERS.find(u => u.username === memerUserUsername);

    if (!memberUser) {
        res.status(411).json({
            message: "No user with this username exists in our db"
        })
        return
    }

    const newMember = {
        id:memberUser.id,
        username:memberUser.username
    };
    organization.members.push(newMember);

    res.json({
        message: "New member added!"
    })
})

app.post("/board", authMiddleware ,(req, res) => {
    const userId = req.userId;
    const organizationId = req.body.organizationId;
    const boardName = req.body.boardName;

    const organization = ORGANIZATIONS.find(org => org.id == organizationId);
    if (!organization || organization.admin !== userId) {
        return res.status(411).json({
            message: "Either this org doesnt exist or you are not an admin of this org"
        })
        
    }

    BOARDS.push({
        id:BOARD_ID++,
        boardName,
        organizationId
    });


    return res.status(200).json({
        "message":"Board Created Succesfully"
    });


})

// if user is member of organization and board belongs to organization then let issue be added
app.post("/issue", authMiddleware,(req, res) => {
    // boardId , issue , token [userId and origanizationId]
    const userId = req.userId;
    const boardId = req.body.boardId;
    const issue = req.body.issue;
    

    // 1 boardId se Organization 
    const searchBoard = BOARDS.find(board => board.id == boardId);

    if(!searchBoard){
        return res.status(404).json({
            "message":"Board Dosen't Exsist"
        });
    }

    const organizationId = searchBoard.organizationId;

    const organization = ORGANIZATIONS.find(org => org.id == organizationId);
    
    if(!organization){
        return res.status(411).json({
            message:"Organization Dosent Exsist"
        });
    }

    const isMember =  organization.members.find(mem =>  mem.id == userId);

    if(!organization || (organization.admin != userId && !isMember)){
         return res.status(411).json({
            message: "Either this org doesnt exist or you are not an member of this org"
        })
    }

    ISSUES.push({
        id:ISSUES_ID++,
        issue,
        boardId
    });

    return res.status(200).json({
        "message":"Issues Added Succesfully"
    });

})

//GET endpoints
app.get("/organization", authMiddleware, (req, res) => {
    const userId = req.userId;
    const organizationId = parseInt(req.query.organizationId); // "1"

    const organization = ORGANIZATIONS.find(org => org.id === organizationId);

    // console.log(organization);
    // console.log(userId);
    if (!organization || organization.admin !== userId) {
        res.status(411).json({
            message: "Either this org doesnt exist or you are not an admin of this org"
        })
        return
    }

    res.json({
        organization: {
            ...organization,
            members: organization.members.map(member => {
                const user = USERS.find(user => user.id === member.id);
                return {
                    id: user.id,
                    username: user.username
                }
            })
        }
    })
})

app.get("/boards",authMiddleware,(req, res) => {

    const userId = req.userId;
    const organizationId = req.body.organizationId;
   
    const organization = ORGANIZATIONS.find(org => org.id == organizationId);
    
    if(!organization){
        return res.status(411).json({
            message:"Organization Dosent Exsist"
        });
    }
    console.log(organization.members);
    const isMember =  organization.members.find(mem =>  mem.id == userId);

    console.log("user ",userId);
    console.log(isMember);

    if(organization.admin != userId && !isMember){
        return res.status(411).json({
            message:"You dont have access to Board"
        })
    }
    
    const boards = BOARDS.find(board => board.organizationId == organizationId);
    if(!boards){
        return res.status(404).json({
            "message":"No Boards Found"
        });
    }

   const returnObj = BOARDS.reduce((accumulator,board)=>{
        if(board.organizationId == organizationId){
            accumulator.push({
                id:board.id,
                title:board.boardName
            })
        }
        
        return accumulator;
    },[]);

    return res.status(200).json({boards:returnObj});
    
})

app.get("/issues",authMiddleware, (req, res) => {
    
    const userId = req.userId;
    const boardId = req.body.boardId;
    console.log("userId ",userId);

    // 1 boardId se Organization 
    const searchBoard = BOARDS.find(board => board.id == boardId);

    if(!searchBoard){
        return res.status(404).json({
            "message":"Board Dosen't Exsist"
        });
    }

    const organizationId = searchBoard.organizationId;

    // 2 Organization se user Validate
    const organization = ORGANIZATIONS.find(org => org.id == organizationId);
    
    if(!organization){
        return res.status(411).json({
            message:"Organization Dosent Exsist"
        });
    }

    const isMember =  organization.members.find(mem =>  mem.id == userId);


    if(organization.admin != userId && !isMember){
        return res.status(411).json({
            message:"You dont have access to Board"
        })
    }


    // if(!organization && (organization.admin !== userId || !isMember)){
    //      return res.status(411).json({
    //         message: "Either this org doesnt exist or you are not an member of this org"
    //     })
    // }

    const issues = ISSUES.find(issue => issue.boardId == boardId);

    if(!issues){
        return res.status(404).json({
            "message":"No Issues Found"
        });
    }

    const returnObj = ISSUES.reduce((accumulator,issue)=>{
        if(issue.boardId == boardId){
            accumulator.push({
                id:issue.id,
                title:issue.issue
            })
        }
        return accumulator;
    },[]);

    return res.status(200).json({issues:returnObj});

})

app.get("/members", authMiddleware, (req, res) => {
    const userId = req.userId;
    const organizationId = parseInt(req.query.organizationId); // "1"

    const organization = ORGANIZATIONS.find(org => org.id === organizationId);

    if (!organization || organization.admin !== userId) {
        return res.status(411).json({
            message: "Either this org doesnt exist or you are not an admin of this org"
        })
        
    }

    return res.status(200).json(
        organization.members
    )

})


// UPDATE
app.put("/issues", (req, res) => {
    const userId = req.userId;
    const issueId = req.body.id;
    const issueText = req.body.issue;

    // check which board issue belongs to
    // check the board belongs to which org and is user part of it

    const issue = ISSUES.find(issue => issue.id == issueId);
    if(!issue){
        return res.json({
            "message":"No issue found"
        })
    }

    const boardId = issue.boardId;
    
    // 1 boardId se Organization 
    const searchBoard = BOARDS.find(board => board.id == boardId);

    if(!searchBoard){
        return res.status(404).json({
            "message":"Board Dosen't Exsist"
        });
    }

    const organizationId = searchBoard.organizationId;

    // 2 Organization se user Validate
    const organization = ORGANIZATIONS.find(org => org.id == organizationId);
    
    const isMember =  org.members.length > 0 ? org.members.find(mem =>  mem.id == userId) : false;

    if(!organization && (organization.admin == userId || isMember)){
         return res.status(411).json({
            message: "Either this org doesnt exist or you are not an member of this org"
        })
    }

    const issueArray = ISSUES.map(issue => issue.id == issueId ? issue.issue = issueText : issue.issue);

    return res.status(200).json({
        "message":"Issue Updated Successfully"
    });



})

//DELETE -- FIND THE GBUG and fix it
app.delete("/members", authMiddleware, (req, res) => {
    const userId = req.userId;
    const organizationId = req.body.organizationId;
    const memerUserUsername = req.body.memberUserUsername;

    const organization = ORGANIZATIONS.find(org => org.id === organizationId);

    if (!organization || organization.admin !== userId) {
        res.status(411).json({
            message: "Either this org doesnt exist or you are not an admin of this org"
        })
        return
    }

    const memberUser = USERS.find(u => u.username === memerUserUsername);

    if (!memberUser) {
        res.status(411).json({
            message: "No user with this username exists in our db"
        })
        return
    }

    
    organization.members = organization.members.filter(user => user.id === memberUser.id);

    res.json({
        message: "member deleted!"
    })
})

app.listen(3000);