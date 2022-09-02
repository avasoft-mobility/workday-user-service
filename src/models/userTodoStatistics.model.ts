import TeamStat from "./teamStats";
import MyStat from "./myStats";

interface UserTodoStatistics {
  teamStatistics: TeamStat;
  myStatistics: MyStat;
  date: string;
}

export default UserTodoStatistics;
