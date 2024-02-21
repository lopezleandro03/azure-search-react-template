const { SearchClient, AzureKeyCredential } = require("@azure/search-documents");

const indexName = process.env["SearchIndexName"];
const apiKey = process.env["SearchApiKey"];
const searchServiceName = process.env["SearchServiceName"];

// Create a SearchClient to send queries
const client = new SearchClient(
    `https://` + searchServiceName + `.search.windows.net/`,
    indexName,
    new AzureKeyCredential(apiKey)
);

// creates filters in odata syntax
const createFilterExpression = (filterList, facets) => {
    let i = 0;
    let filterExpressions = [];

    while (i < filterList.length) {        
        let field = filterList[i].field;
        let value = filterList[i].value;

        if (facets[field] === 'array') {
            filterExpressions.push(`${field}/any(t: search.in(t, '${value}', ','))`);
        } else {
            filterExpressions.push(`${field} eq '${value}'`);
        }
        i += 1;
    }

    return filterExpressions.join(' and ');
}

// reads in facets and gets type
// array facets should include a * at the end 
// this is used to properly create filters
const readFacets = (facetString) => {
    let facets = facetString.split(",");
    let output = {};
    facets.forEach(function (f) {
        if (f.indexOf('*') > -1) {
            output[f.replace('*', '')] = 'array';
        } else {
            output[f] = 'string';
        }
    })

    return output;
}


// Function to generate embeddings using Azure Open AI  
async function generateQueryEmbedding(input) {  
    // Set Azure OpenAI API parameters from environment variables  
    const apiKey = process.env.AZURE_OPENAI_API_KEY;  
    const apiBase = `https://${process.env.AZURE_OPENAI_SERVICE_NAME}.openai.azure.com`;  
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;  
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;  
    
    try {  
      const response = await axios.post(  
        `${apiBase}/openai/deployments/${deploymentName}/embeddings?api-version=${apiVersion}`,  
        {  
          input,  
          engine: "text-embedding-ada-002",  
        },  
        {  
          headers: {  
            "Content-Type": "application/json",  
            "api-key": apiKey,  
          },  
        }  
      );  
    
      const embedding = response.data.data[0].embedding;  
      return embedding;  
    } catch (error) {  
      console.error("Error generating query embedding: ", error.message);  
      throw error;  
    } 
} 

module.exports = async function (context, req) {

    //context.log(req);

    try {
        // Reading inputs from HTTP Request
        let q = (req.query.q || (req.body && req.body.q));
        const top = (req.query.top || (req.body && req.body.top));
        const skip = (req.query.skip || (req.body && req.body.skip));
        const filters = (req.query.filters || (req.body && req.body.filters));
        const facets = readFacets(process.env["SearchFacets"]);
        
        // Creating SearchOptions for query
        let searchOptions = {
            top: top,
            skip: skip,
            includeTotalCount: true,
            facets: Object.keys(facets),
            filter: createFilterExpression(filters, facets)
        };

        // If search term is empty, search everything
        if (!q || q === "") {
            q = "*";
        }
        else {
            // Create embedding of the search query
            const queryEmbedding = await generateQueryEmbedding(q);
            searchOptions.vector = {  
                value: queryEmbedding,  
                kNearestNeighborsCount: top,  
                fields: ["titleVector", "descriptionVector"],  
            }
        }

        // Sending the search request
        const searchResults = await client.search(q, searchOptions);

        // Getting results for output
        const output = [];
        for await (const result of searchResults.results) {
            output.push(result);
        }

        // Logging search results
         context.log(searchResults.count);

        // Creating the HTTP Response
        context.res = {
            // status: 200, /* Defaults to 200 */
            headers: {
                "Content-type": "application/json"
            },
            body: {
                count: searchResults.count,
                results: output,
                facets: searchResults.facets
            }
        };
    } catch (error) {
        context.log.error(error);

        // Creating the HTTP Response
        context.res = {
            status: 400,
            body: {
                innerStatusCode: error.statusCode || error.code,
                error: error.details || error.message
            }
        };
    }

};
