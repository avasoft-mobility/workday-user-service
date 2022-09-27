import sgMail from "@sendgrid/mail";
import MicrosoftUser from "../models/microsoftUser.model";
import dotenv from "dotenv";

dotenv.config();

const sendReporteesRequestMail = async (
  teamName: string,
  mailRequest: string,
  mailSubject: string,
  migrationId: string,
  message: string,
  reportees: MicrosoftUser[],
  toUserDetails: MicrosoftUser
) => {
  sgMail.setApiKey(process.env.SEND_GRID_API_KEY!);

  const REQUEST_MESSAGE_TO_ADMIN = {
    to: ["surya.r@avasoft.com"],
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
    </style>
  
  
    <h4 style="margin-bottom: 0;">${teamName},</h4>
    <p>${message}</p>
    <br>
    <h5>To User : </h5>
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
    <div id="buttons">
    <a href="http://localhost:3000/users/reportee-migration/${migrationId}/reject" style="border-radius: 4px;
    border: 1px solid #DB4437;
    font-size:12px;
    float: right;
    text-decoration: none;
    color: #DB4437;
    margin:0px 15px;
    padding: 10px 16px;" id="reject">REJECT REQUEST</a>

    <a style ="
    text-decoration: none;
    font-size:12px;
    float:right;
    border: 1px solid #0F9D58;
    background: #0F9D58;
    color: #ffffff;
    padding: 10px 16px ;
    border-radius: 4px;" href="http://localhost:3000/users/reportee-migration/${migrationId}/accept" id="button">ACCEPT REQUEST</a>
   
    </div>
    <div>
    <p>Regards,</p>
    <p>WorkdayTeam</p>
  </div>
  </body>`,
  };

  const ADMIN_RESPONSE_MESSAGE_TO_USER = {
    to: toUserDetails.mail,
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
    </style>
  
  
    <h4 style="margin-bottom: 0;">${teamName},</h4>
    <p>${message}</p>
    <br>
    <h5>To User : </h5>
    <p>Name: ${toUserDetails.name}</p>
    <p>E-Mail: ${toUserDetails.mail}</p>
    <p>Domain: ${toUserDetails.practice}</p>
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
    <div>
    <p>Regards,</p>
    <p>WorkdayTeam</p>
  </div>   
  </body>`,
  };

  const REQUEST_MESSAGE_TO_USER = {
    to: toUserDetails.mail,
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
    </style>
  
  
    <h4 style="margin-bottom: 0;">${teamName},</h4>
    <p>${message}</p>
    <p>Reference ID : ${migrationId}</p>
    <br>
    <h5>To User : </h5>
    <p>Name: ${toUserDetails.name}</p>
    <p>E-Mail: ${toUserDetails.mail}</p>
    <p>Domain: ${toUserDetails.practice}</p>
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
    <div>
    <p>Regards,</p>
    <p>WorkdayTeam</p>
  </div>
  </body>`,
  };

  if (mailRequest == "request") {
    const result = await sgMail.sendMultiple(REQUEST_MESSAGE_TO_ADMIN);
    return result;
  }
  if (mailRequest == "accept" || mailRequest == "reject") {
    const result = await sgMail.sendMultiple(ADMIN_RESPONSE_MESSAGE_TO_USER);
    return result;
  }

  if (mailRequest == "toUser") {
    const result = await sgMail.sendMultiple(REQUEST_MESSAGE_TO_USER);
    return result;
  }
};

export { sendReporteesRequestMail };
