import { GroupedTestResultsTable } from '@/components/Table/GroupedTestResultsTable';

const PreviousResults = () => {
  return (
    <section className="py-16 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-2">Your Previous Test Results</h2>
        <p className="text-center text-gray-600 mb-8">Browse and analyze your internet quality test results</p>

        {/* Use the real GroupedTestResultsTable component */}
        <GroupedTestResultsTable />
      </div>
    </section>
  );
};

export default PreviousResults;