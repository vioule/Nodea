const models = require("@app/models");
const model_builder = require("./model_builder");
const fs = require("fs-extra");

const sort = (prop, arr) => {
	const path = prop.path.split(".");
	const len = path.length;

	return arr.sort((a, b) => {
		let i = 0;
		while (i < len) {
			a = a[path[i]];
			if (a === null) {
				break;
			}
			i++;
		}
		i = 0;
		while (i < len) {
			b = b[path[i]];
			if (b === null) {
				break;
			}
			i++;
		}
		if (prop.direction === "asc") {
			if (a < b || b === null) {
				return -1;
			}
			if (a > b || a === null) {
				return 1;
			}
		} else {
			if (a > b || a === null) {
				return -1;
			}
			if (a < b || b === null) {
				return 1;
			}
		}
		return 0;
	});
};

async function getDatalistData(modelName, params, order, start, length, search, searchTerm, speWhere, toInclude) {
	// If request come from widget lastrecord, then default query order is ID DESC
	if (params.widgetType == "lastrecords") order = [["id", "DESC"]];

	// Building final query object
	let queryObject;
	if (search[searchTerm].length == 0) queryObject = { where: {}, order };
	else queryObject = { where: search, order };

	// Remove order on deep path
	let toOrderManually;
	if (typeof queryObject.order[0][0] === "object") {
		toOrderManually = {
			path: queryObject.order[0][0].val,
			direction: queryObject.order[0][1],
		};
		queryObject.order = [];
	}

	if (speWhere)
		for (const prop of Reflect.ownKeys(speWhere)) {
			try {
				if (Array.isArray(queryObject.where[prop]))
					queryObject.where[prop] = queryObject.where[prop] ? [...queryObject.where[prop], ...speWhere[prop]] : speWhere[prop];
				else queryObject.where[prop] = queryObject.where[prop] ? { ...queryObject.where[prop], ...speWhere[prop] } : speWhere[prop];
			} catch (err) {
				console.error(err);
				queryObject.where[prop] = speWhere[prop];
			}
		}

	// If postgres, then we have to parse all value to text, postgres cannot compare varchar with integer for example
	if (models.sequelize.options.dialect == "postgres" && typeof queryObject.where !== "undefined")
		for (const item in queryObject.where[searchTerm]) {
			const currentItem = queryObject.where[searchTerm][item];
			const [attribute] = Object.keys(currentItem);
			let cast = models.sequelize.cast(models.sequelize.col(modelName + "." + attribute), "text");
			// Remove modelName to avoid missing from clause entry for table error for include fields
			if (cast.val.col.includes("$")) {
				cast = models.sequelize.cast(models.sequelize.col(attribute), "text");
				cast.val.col = cast.val.col.substring(1, cast.val.col.length - 1);
			}
			// Don't convert boolean to text, postgres need real boolean in order to work correctly
			if (typeof currentItem[attribute] !== "boolean") currentItem[attribute] = models.sequelize.where(cast, currentItem[attribute]);
		}

	// Build include from field array
	// At the moment queryObject.include = [ 'id', 'r_user.f_nom', 'r_user.r_parent.f_email']
	// `model_builder.getIncludeFromFields()` transform this array into a squelize include object
	const entityName = `e_${modelName.substring(2)}`;
	queryObject.include = model_builder.getIncludeFromFields(models, entityName, toInclude);

	queryObject.distinct = true;

	// Execute query with filters and get total count
	let result;

	try {
		result = await models[modelName].findAndCountAll(queryObject);
	} catch (err) {
		console.error("DATALIST ERROR, TRYING WITH SUBQUERY PARAM");
		console.error(err.message);

		queryObject.subQuery = true;
		if (queryObject.order.length && queryObject.order.length > 0) queryObject.order = [];
		result = await models[modelName].findAndCountAll(queryObject);
	}

	if (toOrderManually) {
		result.rows = sort(toOrderManually, result.rows);
	}

	const lightRows = result.rows.map((elem) => elem.get({ plain: true })).slice(start, start + length);

	return {
		recordsTotal: result.count,
		recordsFiltered: result.count,
		data: lightRows,
	};
}

async function getSubdatalistData(modelName, params, order, start, length, search, searchTerm, toInclude) {
	const sourceId = params.sourceId;
	const subentityAlias = params.subentityAlias,
		subentityName = params.subentityModel;
	const subentityModel = params.subentityModel.capitalizeFirstLetter();
	const isNotManyToManyAssociation = params.paginate;

	const include = {
		model: models[subentityModel],
		as: subentityAlias,
		include: model_builder.getIncludeFromFields(models, subentityName, toInclude), // Get sequelize include object
	};

	let toOrderManually;
	// Rework order for include, only handle order format like: [['id', 'desc']]
	if (order && typeof order[0][0] == "string" && typeof order[0][1] == "string") {
		if (isNotManyToManyAssociation) order = [[{ model: models[subentityModel], as: subentityAlias }, ...order[0]]];
		else order = [[...order[0]]];
	} else {
		// Remove order on deep path
		if (typeof order[0][0] === "object") {
			toOrderManually = {
				path: order[0][0].val,
				direction: order[0][1],
			};
			order = [];
		}
	}

	if (search[searchTerm].length > 0) include.where = search;

	if (!isNotManyToManyAssociation) {
		// Need to find other side relation because we are not going to include subdatalist data
		// We are going to query directly subdatalist and include main entity
		const mainRelationFile = JSON.parse(fs.readFileSync(__dirname + "/../../app/models/options/" + modelName.toLowerCase() + ".json"));
		const troughTable = mainRelationFile.find((x) => x.as == subentityAlias).through;
		const subentityRelationFile = JSON.parse(fs.readFileSync(__dirname + "/../../app/models/options/" + subentityName + ".json"));
		const mainRelation = subentityRelationFile.find((x) => x.through == troughTable);

		include.include.push({
			model: models[modelName],
			as: mainRelation.as,
			where: {
				id: parseInt(sourceId),
			},
			required: true,
		});
	}

	include.required = false;

	let entity = {},
		count;
	try {
		if (isNotManyToManyAssociation) {
			include.separate = true;
			include.order = order;
			entity = await models[modelName].findOne({
				where: {
					id: parseInt(sourceId),
				},
				include,
			});
		} else {
			include.separate = false;
			entity[subentityAlias] = await models[subentityModel].findAll({
				include: include.include,
				order,
			});
			count = await models[subentityModel].count({
				where: include.where,
				include: include.include,
			});
		}
	} catch (err) {
		console.warn("SQL ERROR ON SUBDATALIST ->", err.message);

		// Desactivate it only if error talk about it
		if (err.message && err.message.includes("separate")) include.separate = false;
		// TODO: Order on include sometime do not work because Sequelize decide to do 2 request with the first one without include
		// Try with order in include
		include.order = [[order[0][1], order[0][2]]];
		entity = await models[modelName].findOne({
			where: {
				id: parseInt(sourceId),
			},
			include: include,
		});
	}

	if (isNotManyToManyAssociation && !entity["count" + subentityAlias.capitalizeFirstLetter()])
		throw new Error("count" + subentityAlias.capitalizeFirstLetter() + " is undefined");

	if (isNotManyToManyAssociation) {
		count = entity[subentityAlias].length;
	}

	if (toOrderManually) {
		entity[subentityAlias] = sort(toOrderManually, entity[subentityAlias]);
	}

	return {
		recordsTotal: count,
		recordsFiltered: count,
		data: entity[subentityAlias].map((elem) => elem.get({ plain: true })).slice(start, start + length),
	};
}

// Prototype:
//  - modelName: 'E_user'
//  - params: {columnsTypes:[], columns:[], search:{}} - body from datatables (req.body)
//  - speInclude - optional: ['r_inclusion.r_specific.id',] - array of field path used to build query's include
//  - speWhere - optional: {id: 1, property: 'value'}
module.exports = async (modelName, params, speInclude, speWhere, isSubdatalist = false) => {
	const entityOptions = !isSubdatalist ? models[modelName].getRelations() : models[params.subentityModel.capitalizeFirstLetter()].getRelations();
	const start = params.start ? parseInt(params.start) : 0;
	const length = params.length ? parseInt(params.length) : 25;

	const toInclude = speInclude || [];
	const isGlobalSearch = params.search.value != "";
	const search = {},
		searchTerm = isGlobalSearch ? models.$or : models.$and;
	search[searchTerm] = [];

	// Loop over columns array
	for (let i = 0, columns = params.columns; i < columns.length; i++) {
		if (!columns[i].data || columns[i].data == "") continue;

		// Push column's field into toInclude. toInclude will be used to build the sequelize include. Ex: toInclude = ['r_alias.r_other_alias.f_field', 'f_name']
		toInclude.push(columns[i].data);

		if (columns[i].searchable == "false") continue;

		// Check related to multiple deeply
		const lastField = columns[i].data.split(".")[columns[i].data.split(".").length - 1];
		const capitalizeFirstLetter = (val) => String(val).charAt(0).toUpperCase() + String(val).slice(1);
		const isRelatedToMany = (eOptions, path, i = 0) => {
			const filter = eOptions.filter((el) => el.as === path[i])[0];
			let options;
			if (filter) {
				options = models[capitalizeFirstLetter(filter.target)].getRelations();
				if (options.length > 0) {
					return isRelatedToMany(options, path, i + 1);
				}
			}
			return eOptions.find((el) => el.structureType === "relatedToMultiple" && el.as === lastField);
		};
		const RelatedToMultipleColumn = isRelatedToMany(entityOptions, columns[i].data.split("."));
		// const RelatedToMultipleColumn = entityOptions.find((el) => el.structureType === "relatedToMultiple" && el.as === columns[i].data);

		// Add column own search
		if (columns[i].search.value != "") {
			const { type, value } = JSON.parse(columns[i].search.value);

			if (RelatedToMultipleColumn) {
				const usingFields = RelatedToMultipleColumn.usingField.length ? RelatedToMultipleColumn.usingField : [{ value: "id" }];
				const multipleSearch = usingFields.map((usingField) =>
					model_builder.formatSearch(columns[i].data + "." + usingField.value, value, type)
				);
				search[searchTerm].push({ [models.$or]: multipleSearch });
			} else {
				search[searchTerm].push(model_builder.formatSearch(columns[i].data, value, type));
			}
		}
		// Add column global search
		if (isGlobalSearch)
			if (RelatedToMultipleColumn) {
				const usingFields = RelatedToMultipleColumn.usingField.length ? RelatedToMultipleColumn.usingField : [{ value: "id" }];
				const multipleSearch = usingFields.map((usingField) =>
					model_builder.formatSearch(columns[i].data + "." + usingField.value, params.search.value, params.columnsTypes[columns[i].data])
				);
				search[searchTerm].push({ [models.$or]: multipleSearch });
			} else {
				search[searchTerm].push(model_builder.formatSearch(columns[i].data, params.search.value, params.columnsTypes[columns[i].data]));
			}
	}

	// ORDER BY Managment
	let stringOrder = params.columns[params.order[0].column].data;
	const RelatedToMultipleOrderColumn = entityOptions.find((el) => el.structureType === "relatedToMultiple" && el.as === stringOrder);

	if (RelatedToMultipleOrderColumn) {
		const usingFieldsOrder = RelatedToMultipleOrderColumn.usingField.length ? RelatedToMultipleOrderColumn.usingField : [{ value: "id" }];
		stringOrder += "." + usingFieldsOrder[0].value;
	}

	// If ordering on an association field, use Sequelize.literal so it can match field path 'r_alias.f_name'
	const order =
		stringOrder.indexOf(".") != -1 ? [[models.Sequelize.literal(stringOrder), params.order[0].dir]] : [[stringOrder, params.order[0].dir]];

	if (isSubdatalist) return getSubdatalistData(modelName, params, order, start, length, search, searchTerm, toInclude);

	return getDatalistData(modelName, params, order, start, length, search, searchTerm, speWhere, toInclude);
};
