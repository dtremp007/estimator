import { Link } from '@remix-run/react'
import { CSVUploadDialog } from './pricelists+'

export default function Dashboard() {
	return (
		<div className="main-container prose dark:prose-invert">
			<h1>Welcome to ToopJetalt v0.1.0-prerelease</h1>
			<p>
				ToopJetalt is a simple tool to help you estimate the cost of a project.
			</p>
			<h2>How to use</h2>
			<h3>Step 1: Upload a pricelist</h3>
			<p>
				Google Sheets integrating is coming soon. For now, you can upload a CSV
				file.
			</p>
			<CSVUploadDialog />
			<h3>Step 2: Create a takeoff model</h3>
			<p>
				This consists of a script and variables that will be used to calculate
				the cost of your project.{' '}
				<Link
					to={{
						pathname: '/takeoff-models/new',
						search: new URLSearchParams({
							goBackButton: 'Go back to dashboard',
						}).toString(),
					}}
				>
					Create one.
				</Link>
			</p>
			<h3>Step 3: Create an estimate</h3>
			<p>
				Once you have a pricelist and a takeoff model, you can create an
				estimate. You can do that <Link to="/estimates/onboarding">here</Link>.
			</p>
		</div>
	)
}
