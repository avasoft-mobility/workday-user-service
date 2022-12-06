import MicrosoftUser from "../models/microsoftUser.model";
import dotenv from "dotenv";
import AlteredReporteeList from "../models/AlteredReporteeList.model";
dotenv.config();

const SES_CONFIG = {
  accessKeyId: process.env.SES_ACCESS_KEY_ID!,
  secretAccessKey: process.env.SES_SECRET_ACCESS_KEY!,
  region: "ap-south-1",
};

const AWS = require("aws-sdk");
const AWS_SES = new AWS.SES(SES_CONFIG);

let sendMigrationMail = (
  teamName: string,
  mailRequest: string,
  mailSubject: string,
  migrationId: string,
  message: string,
  alteredReporteeList: AlteredReporteeList,
  toUserDetails: MicrosoftUser,
  ccUsers: string[],
  toUsers: string[],
  origin?: string
) => {
  let params = {
    Source: "workday@avasoft.com",
    Destination: {
      ToAddresses: toUsers,
      CcAddresses: ccUsers,
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: emailTemplate(
            teamName,
            mailRequest,
            migrationId,
            message,
            alteredReporteeList,
            toUserDetails,
            origin
          ),
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: mailSubject,
      },
    },
  };
  return AWS_SES.sendEmail(params).promise();
};

const emailTemplate = (
  teamName: string,
  mailRequest: string,
  migrationId: string,
  message: string,
  alteredReporteeList: AlteredReporteeList,
  toUserDetails: MicrosoftUser,
  origin?: string
) => {
  const actualExistingReportees = alteredReporteeList.existingReportees.length;
  if (actualExistingReportees > 50) {
    alteredReporteeList.existingReportees =
      alteredReporteeList.existingReportees.slice(0, 50);
  }

  const actualNewlyAddedReportees = alteredReporteeList.newReportees.length;
  if (actualNewlyAddedReportees > 50) {
    alteredReporteeList.newReportees = alteredReporteeList.newReportees.slice(
      0,
      50
    );
  }

  const actualRemovedReportees = alteredReporteeList.removedReportees.length;
  if (actualRemovedReportees > 50) {
    alteredReporteeList.removedReportees =
      alteredReporteeList.removedReportees.slice(0, 50);
  }

  return `<body>

<style>
  * {
    font-family: Arial, Helvetica, sans-serif;
  }

  #button {
    float: left;
    text-decoration: none;
    background-color:#0F9D58;
    color: #ffffff;
    padding: 15px 20px ;
    border-radius: 4px;
  }

  #reject {
    border-radius: 4px;
    border: 1px solid;
    text-decoration: none;
    color: #DB4437;
    float: left;
    margin:0px 15px;
    padding: 10px 20px;
  }

  #buttons {
    margin-top:25px;
  }

  #customers {
    border-collapse: collapse;
    width: 100%;
    font-size: 12px;
  }

  #customers td,
  #customers th {
    border: 1px solid #ddd;
    padding: 8px;
  }

  #customers tr:nth-child(even) {
    background-color: #f2f2f2;
  }

  #customers tr:hover {
    background-color: #ddd;
  }

  #customers th {
    padding-top: 12px;
    padding-bottom: 12px;
    text-align: left;
    background-color: #04AA6D;
    color: white;
  }

  #redirectionLink {
    margin-top : 30px
  }

  #slNoColumn {
    width: 10%
  }

  #nameColumn {
    width: 35%
  }

  #mailColumn {
    width: 30%
  }

  #practiceColumn {
    width: 25%
  }
</style>


<h4 style="margin-bottom: 0;">${teamName},</h4>
<p>${message}</p>  

<br>
<h5>Requested User : </h5>
<p>Name: ${toUserDetails?.name}</p>
<p>E-Mail: ${toUserDetails?.mail}</p>
<p>Domain: ${toUserDetails?.practice}</p>

<br>
${
  alteredReporteeList.existingReportees.length !== 0
    ? `<h5>Existing Reportees:</h5>
      <table id="customers">
      <tr>
        <th id="slNoColumn">S.No</th>
        <th id="nameColumn">Name</th>
        <th id="mailColumn">E-Mail</th>
        <th id="practiceColumn">Domain</th>
      </tr>
      ${alteredReporteeList.existingReportees?.reduce<string>(
        (total, char, index) => {
          total += `<tr>
    <td id="slNoColumn">${index + 1}</td>
    <td id="nameColumn">${char.name}</td>
    <td id="mailColumn">${char.mail}</td>
    <td id="practiceColumn">${char.practice}</td>
    </tr>`;
          return total;
        },
        ""
      )}
    </table>`
    : ``
}
${
  actualExistingReportees > 50
    ? `<div>
  <p>+ ${actualExistingReportees - 50} items left </p>
  </div>`
    : ``
}

<br>
${
  alteredReporteeList.newReportees.length !== 0
    ? `<h5>New Reportees:</h5> 
      <table id="customers">
      <tr>
      <th id="slNoColumn">S.No</th>
      <th id="nameColumn">Name</th>
      <th id="mailColumn">E-Mail</th>
      <th id="practiceColumn">Domain</th>
      </tr>
      ${alteredReporteeList.newReportees?.reduce<string>(
        (total, char, index) => {
          total += `<tr>
          <td id="slNoColumn">${index + 1}</td>
          <td id="nameColumn">${char.name}</td>
          <td id="mailColumn">${char.mail}</td>
          <td id="practiceColumn">${char.practice}</td>
    </tr>`;
          return total;
        },
        ""
      )}
    </table>`
    : ``
}
${
  actualNewlyAddedReportees > 50
    ? `<div>
  <p>+ ${actualNewlyAddedReportees - 50} items left </p>
  </div>`
    : ``
}

<br>
${
  alteredReporteeList.removedReportees.length !== 0
    ? `<h5>Removed Reportees:</h5>
      <table id="customers">
      <tr>
      <th id="slNoColumn">S.No</th>
      <th id="nameColumn">Name</th>
      <th id="mailColumn">E-Mail</th>
      <th id="practiceColumn">Domain</th>
      </tr>
      ${alteredReporteeList.removedReportees?.reduce<string>(
        (total, char, index) => {
          total += `<tr>
          <td id="slNoColumn">${index + 1}</td>
          <td id="nameColumn">${char.name}</td>
          <td id="mailColumn">${char.mail}</td>
          <td id="practiceColumn">${char.practice}</td>
    </tr>`;
          return total;
        },
        ""
      )}
    </table>`
    : ``
}
${
  actualRemovedReportees > 50
    ? `<div>
  <p>+ ${actualRemovedReportees - 50} items left </p>
  </div>`
    : ``
}

${
  mailRequest === "requested" || mailRequest === "acknowledged"
    ? `<div id= "redirectionLink">
          <h4 style="margin-bottom: 0;display: inline">Click the link to acknowledge / accept this request: </h4>
          <br>
          ${redirectionLink(migrationId, origin)}
        </div>`
    : ``
}
<div>
<p style ="margin-top:50px;">Regards,</p>
<p>WorkdayTeam</p>
</div>   
</body>`;
};

const redirectionLink = (migrationId: string, origin?: string) => {
  if (!origin) {
    return `<a href="https://hive.avasoft.com/todo/index.html#/migration/${migrationId}">https://hive.avasoft.com/todo/index.html#/migration/${migrationId}</a>`;
  }
  if (origin) {
    if (origin.includes("workday.avasoft.com")) {
      return `<a href="https://workday.avasoft.com/migration/${migrationId}">https://workday.avasoft.com/migration/${migrationId}</a>`;
    }
    if (origin.includes("hivenp")) {
      return `<a href="https://hivenp.avasoft.com/workday/index.html#/migration/${migrationId}">https://hivenp.avasoft.com/workday/index.html#/migration/${migrationId}</a>`;
    }
    return `<a href="https://hive.avasoft.com/todo/index.html#/migration/${migrationId}">https://hive.avasoft.com/todo/index.html#/migration/${migrationId}</a>`;
  }
};

export default sendMigrationMail;
