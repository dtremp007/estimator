import { Form } from '@remix-run/react'
import { Button } from './ui/button'
import { Icon } from './ui/icon'

type DeleteEntityBtnProps = {
	entityId: string
	entityType: string
}

export function DeleteEntityBtn(props: DeleteEntityBtnProps) {
	return (
		<Form method="post">
			<input type="hidden" name="id" value={props.entityId} />
			<Button
				type="submit"
				size="sm"
				variant="ghost"
				name="intent"
				value={`${props.entityType}.delete`}
			>
				<Icon name="trash" />
			</Button>
		</Form>
	)
}
