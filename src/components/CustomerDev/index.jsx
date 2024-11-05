import { useEffect, useState } from "react";
import { Card, Typography, Space } from "antd";
const { Paragraph, Text } = Typography;
import { getPageText, matchEmailsInText, removeDuplicates, scrollToEmail, highlightEmail } from "./crawler";
import { message } from "antd";
import style from './index.modules.scss'
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
    } else {
      message.error("这个我不好找，你自己 ctr+F 找吧")
    }
  }
  useEffect(() => {
    console.log("document.body.innerText are changing")
    const emails = extractContactInfoFromPage();
    setEmailList(emails)

  }, [document.body.innerText])
  return (
    <div className={style["email-list"]}>
      {emailList.map((email) => {
        return <Card key={email} style={{ marginBottom: '8px' }}>
          <div className={style['email-list-card']}>
          <Paragraph copyable={{ text: email }}>
            <Text>{email}</Text>
            </Paragraph>
            <Space>
              <a onClick={() => handleClick(email)}>
                删除
              </a>
              <a onClick={() => handleClick(email)}>
                定位
              </a>
            </Space>
          </div>

        </Card>;
      })}
    </div>
  );
}

export default CustomerDev;
