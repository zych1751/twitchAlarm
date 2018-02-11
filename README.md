## 개요
AWS lambda 아키텍처와 slackbot api, twitch api를 이용하여 슬랙봇에 트위치 방송 알림을 준다.

## 실행
~/.aws/credentials, ~/.aws/config 파일의 정보를 채운다.  
environment_variables.json에 해당하는 환경변수 값을 채워준다.  
apex deploy --env-file environment_variables.json  

api gateway에 해당 함수의 mapping template에 Content-Type:application-x-www-form-urlencoded에   
{  
    "body": "$input.body"  
}  
를 추가해준다.
