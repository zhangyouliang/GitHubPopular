import React, {Component} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ListView,
  Image,
  RefreshControl,
  TouchableOpacity,
  DeviceEventEmitter,
} from 'react-native'
import ScrollableTabView, {ScrollableTabBar} from 'react-native-scrollable-tab-view'
import NavigationBar from '../common/NavigationBar'
import TrendingCell from '../common/TrendingCell'
import Popover from '../common/Popover'
import DataRepository, {FLAG_STORAGE} from '../expand/dao/DataRepository'
//获取AsyncStorage中的数据
import LanguageDao, {FLAG_LANGUAGE} from '../expand/dao/LanguageDao'
import TimeSpan from '../model/TimeSpan'
import ProjectModel from "../model/ProjectModel";
//工具函数，检查该Item是否被收藏
import Utils from '../util/Utils'
import FavoriteDao from "../expand/dao/FavoriteDao";
//接口路径
const API_URL = 'https://github.com/trending/';

let timeSpanTextArray = [new TimeSpan('今 天', 'since=daily'),
  new TimeSpan('本 周', 'since=weekly'), new TimeSpan('本 月', 'since=monthly')];
let favoriteDao = new FavoriteDao(FLAG_STORAGE.flag_trending);
let dataRepository = new DataRepository(FLAG_STORAGE.flag_trending);
export default class TrendingPage extends Component {
  constructor(props) {
    super(props);
    this.languageDao = new LanguageDao(FLAG_LANGUAGE.flag_language);
    this.state = {
      languages: [],//数据
      isVisible: false,
      buttonRect: {},
      timeSpan: timeSpanTextArray[0],
    };
  }

  componentDidMount() {
    this.loadData();
  }

  loadData() {
    this.languageDao.fetch()
      .then(result => {
        this.setState({
          languages: result
        })
      })
      .catch(err => {
        console.log(err);
      })
  }

  //显示下拉框
  showPopover() {
    this.refs.button.measure((ox, oy, width, height, px, py) => {
      this.setState({
        isVisible: true,
        buttonRect: {x: px, y: py, width: width, height: height}
      });
    });
  }

  //关闭下拉框
  closePopover() {
    this.setState({
      isVisible: false
    });
  }

  //选择某一项
  onSelectTimeSpan(timeSpan) {
    this.closePopover();
    this.setState({
      timeSpan: timeSpan
    })
  }

  //渲染标题
  renderTitleView() {
    return (
      <View>
        <TouchableOpacity ref='button' onPress={() => {
          this.showPopover();
        }}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text
              style={{fontSize: 18, color: '#fff', fontWeight: '400'}}
            >趋势{this.state.timeSpan.showText}</Text>
            <Image style={{width: 12, height: 12, marginLeft: 5}}
                   source={require('../assets/images/ic_spinner_triangle.png')}></Image>
          </View>
        </TouchableOpacity>
      </View>
    )
  }

  render() {
    let navigationBar =
      <NavigationBar
        titleView={this.renderTitleView()}
        statusBar={{
          backgroundColor: '#2196F3'
        }}
      />;
    let content = this.state.languages.length > 0 ? <ScrollableTabView
      tabBarBackgroundColor='#2196F3'
      tabBarActiveTextColor='#fff'
      tabBarInactiveTextColor='mintcream'
      tabBarUnderlineStyle={{backgroundColor: '#e7e7e7', height: 2}}
      renderTabBar={() => <ScrollableTabBar/>}
    >
      {this.state.languages.map((result, i, arr) => {
        let item = arr[i];
        return item.checked ?
          <TrendingTab {...this.props} key={i} tabLabel={item.name} timeSpan={this.state.timeSpan}/> : null
      })}
    </ScrollableTabView> : null;
    let timeSpanView = <Popover
      contentStyle={{backgroundColor: '#343434', opacity: 0.82}}
      isVisible={this.state.isVisible}
      fromRect={this.state.buttonRect}
      onClose={() => this.closePopover()}
      placement='bottom'
    >
      {timeSpanTextArray.map((result, i, arr) => {
        return (
          <TouchableOpacity
            key={i} onPress={() => this.onSelectTimeSpan(arr[i])}
            underlayColor='transparent'>
            <Text
              style={{fontSize: 18, padding: 8, color: '#fff', fontWeight: '400'}}
            >{arr[i].showText}</Text>
          </TouchableOpacity>
        )
      })}
    </Popover>;
    return (
      <View style={styles.container}>
        {navigationBar}
        {content}
        {timeSpanView}
      </View>
    )
  }
}

class TrendingTab extends Component {
  constructor(props) {
    super(props);
    this.isFavoriteChanged = false;
    this.state = {
      dataSource: new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2}),
      isLoading: false,
      favoriteKeys: [],//收藏的列表
    };
  }

  componentDidMount() {
    this.listener = DeviceEventEmitter.addListener('favoriteChanged_trending', () => {
      this.isFavoriteChanged = true;
    });
    this.loadData(this.props.timeSpan, true);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.timeSpan !== this.props.timeSpan) {
      this.loadData(nextProps.timeSpan);
    } else if (this.isFavoriteChanged) {
      this.isFavoriteChanged = false;
      this.getFavoriteKeys();
    } else if (nextProps.theme !== this.state.theme) {
      this.updateState({theme: nextProps.theme});
      this.flushFavoriteState();
    }
  }

  //更新project每一项收藏的状态
  flushFavoriteState() {
    let projectModels = [];
    let items = this.items;
    for (let i = 0, len = items.length; i < len; i++) {
      projectModels.push(new ProjectModel(items[i], Utils.checkFavorite(items[i], this.state.favoriteKeys)));
    }
    this.updateState({
      isLoading: false,
      dataSource: this.getDataSource(projectModels),
    })
  }

  //获取本地用户收藏的ProjectItem
  getFavoriteKeys() {
    favoriteDao.getFavoriteKeys().then((keys) => {
      if (keys) {
        this.updateState({favoriteKeys: keys});
      }
      this.flushFavoriteState();
    }).catch((error) => {
      this.flushFavoriteState();
      console.log(error);
    });
  }

  getDataSource(items) {
    return this.state.dataSource.cloneWithRows(items);
  }

  //加载数据
  loadData(timeSpan, isRefresh) {
    this.updateState({
      isLoading: true
    });
    let url = this.genFetchUrl(timeSpan, this.props.tabLabel);
    dataRepository.fetchRepository(url)
      .then(result => {
        this.items = result && result.items ? result.items : result ? result : [];
        this.getFavoriteKeys();
        if (!this.items || isRefresh && result && result.update_date && !dataRepository.checkData(result.update_date)) {
          DeviceEventEmitter.emit('showToast', '数据过时');
          return dataRepository.fetchNetRepository(url);
        } else {
          DeviceEventEmitter.emit('showToast', '显示缓存数据');
        }
      })
      .then((items) => {
        if (!items || items.length === 0) return;
        this.items = items;
        this.getFavoriteKeys();
      })
      .catch(err => {
        console.log(err);
        this.updateState({
          isLoading: false
        });
      })
  }

  genFetchUrl(timeSpan, category) {
    return API_URL + category + '?' + timeSpan.searchText;
  }

  //重新加载数据
  onRefresh() {
    this.loadData(this.props.timeSpan, true);
  }

  //重新加载data
  updateState(dic) {
    if (!this) return;
    this.setState(dic);
  }

  //更新favorite
  onUpdateFavorite() {
    this.getFavoriteKeys();
  }

  onSelect(projectModel) {
    this.props.navigation.navigate('RepositoryDetail', {
      projectModel: projectModel,
      flag: FLAG_STORAGE.flag_trending,
      onUpdateFavorite: () => this.onUpdateFavorite(),
    })
  }

  //处理收藏事件
  onFavorite(item, isFavorite) {

    if (isFavorite) {
      favoriteDao.saveFavoriteItem(item.fullName.toString(), JSON.stringify(item))
    } else {
      favoriteDao.removeFavoriteItem(item.fullName.toString())
    }
  }

  renderRow(projectModel) {
    return <TrendingCell
      key={projectModel.item.id}
      onSelect={() => this.onSelect(projectModel)}
      onFavorite={(item, isFavorite) => {
        this.onFavorite(item, isFavorite)
      }}
      projectModel={projectModel}/>
  }

  render() {
    return (
      <View style={styles.container}>
        <ListView
          dataSource={this.state.dataSource}
          renderRow={(data) => this.renderRow(data)}
          refreshControl={
            <RefreshControl
              title='Loading...'
              titleColor={'#2196f3'}
              colors={['#2196f3']}
              refreshing={this.state.isLoading}
              onRefresh={() => this.onRefresh()}
              tintColor={'#2196f3'}
            />
          }
        />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  tips: {
    fontSize: 29
  }
});