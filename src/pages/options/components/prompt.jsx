import { useEffect } from 'preact/hooks'
import {
  defaultConfig,
  getPreferredLanguageKey,
  getUserConfig,
  setUserConfig,
} from '../../../config/index.mjs'
import { Button, Form, Input } from 'antd'
import Browser from 'webextension-polyfill'

function Prompt() {
  const [form] = Form.useForm()
  const Item = Form.Item

  useEffect(() => {
    Browser.storage.local.get().then((configs) => {
      form.setFieldsValue({
        ...(configs.prompt || {}),
      })
    })
  }, [])
  const handleSave = () => {
    form.validateFields().then(async (values) => {
      try {
        await Browser.storage.local.set({ prompt: values })
      } catch (e) {
        console.error('缓存失败:', e)
      } finally {
        console.log('缓存完成')
      }
    })
  }

  const handleGet = async () => {}
  const defaultPrompt =
    '请将以下外贸行业相关的文本准确、流畅、地道地进行翻译。请注意在翻译过程中保持行业专业性，并确保译文质量高。如果文本中出现非目标语言的部分，请根据上下文判断是否需要进行翻译。以下是需翻译的文本：'
  return (
    <div>
      <Form form={form} name="prompt">
        <Item
          label="翻译"
          name="translate"
          tooltip="自己填写会翻译得更好哦"
          rules={[
            {
              required: true,
              message: 'prompt不能为空',
            },
          ]}
          initialValue={defaultPrompt}
        >
          <Input.TextArea placeholder="请输入翻译专用Prompt" />
        </Item>
        <Button onClick={handleSave}>保存</Button>
      </Form>
    </div>
  )
}

export default Prompt
