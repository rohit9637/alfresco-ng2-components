/*!
 * @license
 * Copyright 2019 Alfresco Software, Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { LoginPage, LocalStorageUtil, BrowserActions } from '@alfresco/adf-testing';
import { ContentServicesPage } from '../../pages/adf/contentServicesPage';
import { ViewerPage } from '../../pages/adf/viewerPage';
import { MetadataViewPage } from '../../pages/adf/metadataViewPage';

import { AcsUserModel } from '../../models/ACS/acsUserModel';
import { FileModel } from '../../models/ACS/fileModel';

import TestConfig = require('../../test.config');
import resources = require('../../util/resources');
import dateFormat = require('dateformat');

import { AlfrescoApiCompatibility as AlfrescoApi } from '@alfresco/js-api';
import { UploadActions } from '../../actions/ACS/upload.actions';
import { NavigationBarPage } from '../../pages/adf/navigationBarPage';

describe('Metadata component', () => {

    const METADATA = {
        DATA_FORMAT: 'mmm dd yyyy',
        TITLE: 'Details',
        COMMENTS_TAB: 'COMMENTS',
        PROPERTY_TAB: 'PROPERTIES',
        DEFAULT_ASPECT: 'Properties',
        MORE_INFO_BUTTON: 'More information',
        LESS_INFO_BUTTON: 'Less information',
        ARROW_DOWN: 'keyboard_arrow_down',
        ARROW_UP: 'keyboard_arrow_up',
        EDIT_BUTTON_TOOLTIP: 'Edit'
    };

    const loginPage = new LoginPage();
    const contentServicesPage = new ContentServicesPage();
    const viewerPage = new ViewerPage();
    const metadataViewPage = new MetadataViewPage();
    const navigationBarPage = new NavigationBarPage();

    const acsUser = new AcsUserModel();

    const folderName = 'Metadata Folder';

    const pngFileModel = new FileModel({
        'name': resources.Files.ADF_DOCUMENTS.PNG.file_name,
        'location': resources.Files.ADF_DOCUMENTS.PNG.file_location
    });

    const uploadActions = new UploadActions();

    beforeAll(async (done) => {

        this.alfrescoJsApi = new AlfrescoApi({
            provider: 'ECM',
            hostEcm: TestConfig.adf.url
        });

        await this.alfrescoJsApi.login(TestConfig.adf.adminEmail, TestConfig.adf.adminPassword);

        await this.alfrescoJsApi.core.peopleApi.addPerson(acsUser);

        await this.alfrescoJsApi.login(acsUser.id, acsUser.password);

        const pngUploadedFile = await uploadActions.uploadFile(this.alfrescoJsApi, pngFileModel.location, pngFileModel.name, '-my-');

        Object.assign(pngFileModel, pngUploadedFile.entry);

        pngFileModel.update(pngUploadedFile.entry);

        done();
    });

    describe('Viewer Metadata', () => {

        beforeAll(async () => {
            await loginPage.loginToContentServicesUsingUserModel(acsUser);
            navigationBarPage.clickContentServicesButton();
            contentServicesPage.waitForTableBody();

            await LocalStorageUtil.setConfigField('content-metadata', JSON.stringify({
                presets: {
                    default: {
                        'exif:exif': '*'
                    }
                }
            }));
        });

        beforeEach(async (done) => {
            viewerPage.viewFile(pngFileModel.name);
            viewerPage.checkFileIsLoaded();
            done();
        });

        afterEach(() => {
            viewerPage.clickCloseButton();
            contentServicesPage.waitForTableBody();
        });

        it('[C245652] Should be possible to display a file\'s properties', () => {
            viewerPage.clickInfoButton();
            viewerPage.checkInfoSideBarIsDisplayed();
            metadataViewPage.clickOnPropertiesTab();

            expect(metadataViewPage.getTitle()).toEqual(METADATA.TITLE);
            expect(viewerPage.getActiveTab()).toEqual(METADATA.PROPERTY_TAB);
            expect(metadataViewPage.getExpandedAspectName()).toEqual(METADATA.DEFAULT_ASPECT);
            expect(metadataViewPage.getName()).toEqual(pngFileModel.name);
            expect(metadataViewPage.getCreator()).toEqual(pngFileModel.getCreatedByUser().displayName);
            expect(metadataViewPage.getCreatedDate()).toEqual(dateFormat(pngFileModel.createdAt, METADATA.DATA_FORMAT));
            expect(metadataViewPage.getModifier()).toEqual(pngFileModel.getCreatedByUser().displayName);
            expect(metadataViewPage.getModifiedDate()).toEqual(dateFormat(pngFileModel.createdAt, METADATA.DATA_FORMAT));
            expect(metadataViewPage.getMimetypeName()).toEqual(pngFileModel.getContent().mimeTypeName);
            expect(metadataViewPage.getSize()).toEqual(pngFileModel.getContent().getSizeInBytes());

            metadataViewPage.editIconIsDisplayed();
            metadataViewPage.informationButtonIsDisplayed();
            expect(metadataViewPage.getInformationButtonText()).toEqual(METADATA.LESS_INFO_BUTTON);
            expect(metadataViewPage.getInformationIconText()).toEqual(METADATA.ARROW_UP);
        });

        it('[C272769] Should be possible to display more details when clicking on More Information button', () => {
            viewerPage.clickInfoButton();
            viewerPage.checkInfoSideBarIsDisplayed();
            metadataViewPage.clickOnPropertiesTab();
            metadataViewPage.informationButtonIsDisplayed();
            metadataViewPage.clickOnInformationButton();
            expect(metadataViewPage.getInformationButtonText()).toEqual(METADATA.MORE_INFO_BUTTON);
            expect(metadataViewPage.getInformationIconText()).toEqual(METADATA.ARROW_DOWN);
        });

        it('[C270952] Should be possible to open/close properties using info icon', () => {
            viewerPage.clickInfoButton();
            viewerPage.checkInfoSideBarIsDisplayed();
            metadataViewPage.clickOnPropertiesTab().informationButtonIsDisplayed();
            viewerPage.clickInfoButton();
            viewerPage.checkInfoSideBarIsNotDisplayed();
            viewerPage.clickInfoButton();
            viewerPage.checkInfoSideBarIsDisplayed();
            expect(viewerPage.getActiveTab()).toEqual(METADATA.COMMENTS_TAB);
            metadataViewPage.clickOnPropertiesTab();
            expect(viewerPage.getActiveTab()).toEqual(METADATA.PROPERTY_TAB);
            expect(metadataViewPage.getEditIconTooltip()).toEqual(METADATA.EDIT_BUTTON_TOOLTIP);
        });

        it('[C245654] Should be possible edit the basic Metadata Info of a Document', () => {
            viewerPage.clickInfoButton();
            viewerPage.checkInfoSideBarIsDisplayed();
            metadataViewPage.clickOnPropertiesTab();
            metadataViewPage.editIconIsDisplayed();

            expect(viewerPage.getActiveTab()).toEqual(METADATA.PROPERTY_TAB);

            metadataViewPage.editIconClick();
            metadataViewPage.editPropertyIconIsDisplayed('name');
            metadataViewPage.editPropertyIconIsDisplayed('properties.cm:title');
            metadataViewPage.editPropertyIconIsDisplayed('properties.cm:description');

            expect(metadataViewPage.getPropertyIconTooltip('name')).toEqual('Edit');
            expect(metadataViewPage.getPropertyIconTooltip('properties.cm:title')).toEqual('Edit');
            expect(metadataViewPage.getPropertyIconTooltip('properties.cm:description')).toEqual('Edit');

            metadataViewPage.clickEditPropertyIcons('name');
            metadataViewPage.updatePropertyIconIsDisplayed('name');
            metadataViewPage.clearPropertyIconIsDisplayed('name');

            metadataViewPage.enterPropertyText('name', 'exampleText');
            metadataViewPage.clickClearPropertyIcon('name');
            expect(metadataViewPage.getPropertyText('name')).toEqual(resources.Files.ADF_DOCUMENTS.PNG.file_name);

            metadataViewPage.clickEditPropertyIcons('name');
            metadataViewPage.enterPropertyText('name', 'exampleText.png');
            metadataViewPage.clickUpdatePropertyIcon('name');
            expect(metadataViewPage.getPropertyText('name')).toEqual('exampleText.png');

            metadataViewPage.clickEditPropertyIcons('properties.cm:title');
            metadataViewPage.enterPropertyText('properties.cm:title', 'example title');
            metadataViewPage.clickUpdatePropertyIcon('properties.cm:title');
            expect(metadataViewPage.getPropertyText('properties.cm:title')).toEqual('example title');

            metadataViewPage.clickEditPropertyIcons('properties.cm:description');
            metadataViewPage.enterDescriptionText('example description');
            metadataViewPage.clickUpdatePropertyIcon('properties.cm:description');
            expect(metadataViewPage.getPropertyText('properties.cm:description')).toEqual('example description');

            viewerPage.clickCloseButton();
            contentServicesPage.waitForTableBody();

            viewerPage.viewFile('exampleText.png');
            viewerPage.clickInfoButton();
            viewerPage.checkInfoSideBarIsDisplayed();
            metadataViewPage.clickOnPropertiesTab();
            metadataViewPage.editIconIsDisplayed();

            expect(metadataViewPage.getPropertyText('name')).toEqual('exampleText.png');
            expect(metadataViewPage.getPropertyText('properties.cm:title')).toEqual('example title');
            expect(metadataViewPage.getPropertyText('properties.cm:description')).toEqual('example description');

            metadataViewPage.editIconClick();
            metadataViewPage.clickEditPropertyIcons('name');
            metadataViewPage.enterPropertyText('name', resources.Files.ADF_DOCUMENTS.PNG.file_name);
            metadataViewPage.clickUpdatePropertyIcon('name');
            expect(metadataViewPage.getPropertyText('name')).toEqual(resources.Files.ADF_DOCUMENTS.PNG.file_name);
        });

        it('[C260181] Should be possible edit all the metadata aspect', () => {
            viewerPage.clickInfoButton();
            viewerPage.checkInfoSideBarIsDisplayed();
            metadataViewPage.clickOnPropertiesTab();
            metadataViewPage.editIconIsDisplayed();

            expect(viewerPage.getActiveTab()).toEqual(METADATA.PROPERTY_TAB);

            metadataViewPage.clickOnInformationButton();

            metadataViewPage.clickMetadataGroup('EXIF');

            metadataViewPage.editIconClick();

            metadataViewPage.clickEditPropertyIcons('properties.exif:software');
            metadataViewPage.enterPropertyText('properties.exif:software', 'test custom text software');
            metadataViewPage.clickUpdatePropertyIcon('properties.exif:software');
            expect(metadataViewPage.getPropertyText('properties.exif:software')).toEqual('test custom text software');

            metadataViewPage.clickEditPropertyIcons('properties.exif:isoSpeedRatings');
            metadataViewPage.enterPropertyText('properties.exif:isoSpeedRatings', 'test custom text isoSpeedRatings');
            metadataViewPage.clickUpdatePropertyIcon('properties.exif:isoSpeedRatings');
            expect(metadataViewPage.getPropertyText('properties.exif:isoSpeedRatings')).toEqual('test custom text isoSpeedRatings');

            metadataViewPage.clickEditPropertyIcons('properties.exif:fNumber');
            metadataViewPage.enterPropertyText('properties.exif:fNumber', 22);
            metadataViewPage.clickUpdatePropertyIcon('properties.exif:fNumber');
            expect(metadataViewPage.getPropertyText('properties.exif:fNumber')).toEqual('22');
        });

    });

    describe('Folder metadata', () => {

        beforeAll(async (done) => {
            await uploadActions.createFolder(this.alfrescoJsApi, folderName, '-my-');

            await loginPage.loginToContentServicesUsingUserModel(acsUser);
            navigationBarPage.clickContentServicesButton();
            contentServicesPage.waitForTableBody();

            done();
        });

        it('[C261157] Should be possible use the metadata component When the node is a Folder', () => {
            contentServicesPage.metadataContent(folderName);

            expect(metadataViewPage.getPropertyText('name')).toEqual(folderName);
            expect(metadataViewPage.getPropertyText('createdByUser.displayName')).toEqual(acsUser.firstName + ' ' + acsUser.lastName);
            BrowserActions.closeMenuAndDialogs();
        });

        it('[C261158] Should be possible edit the metadata When the node is a Folder', () => {
            contentServicesPage.metadataContent(folderName);

            metadataViewPage.editIconClick();

            metadataViewPage.clickEditPropertyIcons('name');
            metadataViewPage.enterPropertyText('name', 'newnameFolder');
            metadataViewPage.clickClearPropertyIcon('name');
            expect(metadataViewPage.getPropertyText('name')).toEqual(folderName);

            metadataViewPage.clickEditPropertyIcons('name');
            metadataViewPage.enterPropertyText('name', 'newnameFolder');
            metadataViewPage.clickUpdatePropertyIcon('name');
            expect(metadataViewPage.getPropertyText('name')).toEqual('newnameFolder');

            metadataViewPage.clickEditPropertyIcons('name');
            metadataViewPage.enterPropertyText('name', folderName);
            metadataViewPage.clickUpdatePropertyIcon('name');
            expect(metadataViewPage.getPropertyText('name')).toEqual(folderName);
        });

    });

    it('[C279960] Should show the last username modifier when modify a File', async () => {
        await loginPage.loginToContentServices(TestConfig.adf.adminEmail, TestConfig.adf.adminPassword);

        BrowserActions.getUrl(TestConfig.adf.url + `/(overlay:files/${pngFileModel.id}/view)`);

        viewerPage.clickInfoButton();
        viewerPage.checkInfoSideBarIsDisplayed();
        metadataViewPage.clickOnPropertiesTab();
        metadataViewPage.editIconIsDisplayed();

        expect(viewerPage.getActiveTab()).toEqual(METADATA.PROPERTY_TAB);

        metadataViewPage.editIconClick();

        metadataViewPage.clickEditPropertyIcons('properties.cm:description');
        metadataViewPage.enterDescriptionText('check author example description');
        metadataViewPage.clickUpdatePropertyIcon('properties.cm:description');
        expect(metadataViewPage.getPropertyText('properties.cm:description')).toEqual('check author example description');

        loginPage.loginToContentServicesUsingUserModel(acsUser);
        navigationBarPage.clickContentServicesButton();

        viewerPage.viewFile(pngFileModel.name);
        viewerPage.checkFileIsLoaded();

        viewerPage.clickInfoButton();
        viewerPage.checkInfoSideBarIsDisplayed();
        metadataViewPage.clickOnPropertiesTab();

        expect(metadataViewPage.getPropertyText('modifiedByUser.displayName')).toEqual('Administrator');

        viewerPage.clickCloseButton();
        contentServicesPage.waitForTableBody();
    });

});
