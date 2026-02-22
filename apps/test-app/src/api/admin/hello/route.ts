import type { Request, Response } from "express"
import { HELLO_MODULE } from "../../../modules/hello-module/index.js"

export async function GET(req: Request & { scope: any }, res: Response) {
  const helloService = req.scope.resolve(HELLO_MODULE)
  const result = await helloService.sayHello(
    (req.query.name as string) ?? "World"
  )
  res.json(result)
}

export async function POST(req: Request & { scope: any }, res: Response) {
  const helloService = req.scope.resolve(HELLO_MODULE)
  const status = await helloService.getStatus()
  res.status(201).json(status)
}
