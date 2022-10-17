import sgMail from "@sendgrid/mail";
import MicrosoftUser from "../models/microsoftUser.model";
import dotenv from "dotenv";

dotenv.config();

const sendMigrationMail = async (
  teamName: string,
  mailRequest: string,
  mailSubject: string,
  migrationId: string,
  message: string,
  reportees: MicrosoftUser[],
  toUserDetails: MicrosoftUser,
  ccUsers: string[],
  toUsers: string[],
  origin?: string
) => {
  sgMail.setApiKey(process.env.SEND_GRID_API_KEY!);

  const REQUEST_MESSAGE = {
    to: toUsers,
    cc: ccUsers,
    from: "workday@avasoft.com",
    subject: mailSubject,
    html: `<body>

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
    </style>
  
  
    <h4 style="margin-bottom: 0;">${teamName},</h4>
    <p>${message}</p>
    <br>
    <h5>Requested User : </h5>
    <p>Name: ${toUserDetails?.name}</p>
    <p>E-Mail: ${toUserDetails?.mail}</p>
    <p>Domain: ${toUserDetails?.practice}</p>
    <br>
    <h5>Reportees:</h5>
    <table id="customers">
      <tr>
        <th>S.No</th>
        <th>Name</th>
        <th>E-Mail</th>
        <th>Domain</th>
      </tr>
      ${reportees?.reduce<string>((total, char, index) => {
        total += `<tr>
        <td>${index + 1}</td>
        <td>${char.name}</td>
        <td>${char.mail}</td>
        <td>${char.practice}</td>
        </tr>`;
        return total;
      }, "")}
    </table>
    ${
      mailRequest === "requested" || mailRequest === "acknowledged"
        ? `<div id= "redirectionLink">
              <h4 style="margin-bottom: 0;display: inline">Click the link to acknowledge / accept this request: </h4>
              <br>
              ${
                origin === "https://ava-cind-todoapp-fe-prod.azurewebsites.net"
                  ? `<a href="${origin}/migration/${migrationId}">${origin}/migration/${migrationId}</a>`
                  : `<a href="https://hivenp.avasoft.com/workday/index.html#/migration/${migrationId}">https://hivenp.avasoft.com/workday/index.html#/migration/${migrationId}</a>`
              }
            </div>`
        : ``
    }
    <div>
    <p style ="margin-top:50px;">Regards,</p>
    <p>WorkdayTeam</p>
  </div>   
  </body>`,
  };

  const result = await sgMail.sendMultiple(REQUEST_MESSAGE);
  return result;
};

export { sendMigrationMail };
