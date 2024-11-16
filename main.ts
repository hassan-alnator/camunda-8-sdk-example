import { Camunda8 } from '@camunda8/sdk'

import 'dotenv/config'; 

const c8 = new Camunda8()
const zeebe = c8.getZeebeGrpcApiClient()
const tasklist = c8.getTasklistApiClient()


console.log('Starting worker...')
zeebe.createWorker({
	taskType: 'service-task',
	taskHandler: (job) => {
		console.log(`[Zeebe Worker] handling job of type ${job.type}`)
		return job.complete({
			serviceTaskOutcome: 'We did it!',
		})
	},
})

zeebe.createWorker({
	taskType: 'io.camunda.zeebe:userTask',
	taskHandler: (job) => {
		console.log(`[Zeebe Worker] handling job of type ${job.type}`)
		return job.complete({
			userTask: 'We did it!',
		})
	},
});

console.log(`Starting human task poller...`)
setInterval(async () => {
	const res = await tasklist.searchTasks({
		state: 'CREATED',
	})
	if (res.length > 0) {
		console.log(`[Tasklist] fetched ${res.length} human tasks`)
		res.forEach(async (task) => {
			console.log(
				`[Tasklist] claiming task ${task.id} from process ${task.processInstanceKey}`
			)
			const t = await tasklist.assignTask({
				taskId: task.id,
				assignee: 'demobot',
				allowOverrideAssignment: true,
			})
			console.log(
				`[Tasklist] servicing human task ${t.id} from process ${t.processInstanceKey}`
			)
			await tasklist.completeTask(t.id, {
				humanTaskStatus: 'Got done',
			})
		})
	} else {
		console.log('No human tasks found')
	}
}, 3000);


(async () => {


const res = await zeebe.deployResource({processFilename: './c8-sdk-demo.bpmn'})
console.log(`Deployed process with BPMN process ID ${res.deployments[0].process}`)
const p = await zeebe.createProcessInstanceWithResult({
	bpmnProcessId: `c8-sdk-demo`,
	variables: {
		humanTaskStatus: 'Needs doing',
	},
});


console.log(`[Zeebe] Finished Process Instance ${p.processInstanceKey}`)
console.log(`[Zeebe] humanTaskStatus is "${p.variables.humanTaskStatus}"`)
console.log(`[Zeebe] serviceTaskOutcome is "${p.variables.serviceTaskOutcome}"`);

})()