import TeamStat from "./teamStats.model";
import MyStat from "./myStats.model";

interface UserTodoStatistics {
  teamStatistics: TeamStat;
  myStatistics: MyStat;
  date: string;
}

export default UserTodoStatistics;
