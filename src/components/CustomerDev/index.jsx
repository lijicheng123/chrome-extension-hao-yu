import { useEffect, useState } from "react";
import { Card, Typography } from "antd";
const { Paragraph, Text } = Typography;

import { getPageText, matchEmailsInText, removeDuplicates, scrollToEmail, highlightEmail } from "./crawler";
function CustomerDev() {
  // email
  const [emailList, setEmailList] = useState([]);
  function extractContactInfoFromPage() {
    // 1. 提取页面文本
    const pageText = getPageText();

    // 2. 从文本中匹配邮箱地址
    const emails = matchEmailsInText(pageText);

    // 3. 删除重复的邮箱地址
    const uniqueEmails = removeDuplicates(emails);

    // 4. 返回邮箱地址列表
    return uniqueEmails;
  }
  const handleClick = (email) => {
    const emailElement = document.querySelector(`[data-email='${email}']`)

    if (emailElement) {
      scrollToEmail(emailElement)
      highlightEmail(emailElement)
    }
  }
  useEffect(() => {
    console.log("document.body.innerText are changing")
    const emails = extractContactInfoFromPage();
    setEmailList(emails)

  }, [document.body.innerText])
  return (
    <div>
      {emailList.map((email) => {
        return <Card key={email}>
          <Paragraph copyable={{ text: email }}>
            <Text>{email}</Text>
            <a onClick={() => handleClick(email)}>
              定位
            </a>
          </Paragraph>
        </Card>;
      })}
    </div>
  );
}

export default CustomerDev;
